'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { getBusinessDateString } from '@/utils/date';
import { revalidatePath } from 'next/cache';
import type {
  CreateSalaryRuleInput,
  RuleConflict,
  SalaryRule,
} from '@/types/salary';

// ============================================================
// SALARY RULES — CRUD
// ============================================================

export async function createSalaryRuleAction(input: CreateSalaryRuleInput) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied. Only admins can manage salary rules.' };
  }

  const orgId = context.organization.id;
  const supabase = await createClient();

  // Validate amount
  if (input.calculation_type !== 'DEDUCTION' && input.amount < 0) {
    return { success: false, error: 'Số tiền không được âm cho loại quy tắc này.' };
  }

  // Validate min/max
  if (input.minimum_salary !== undefined && input.minimum_salary < 0) {
    return { success: false, error: 'Lương tối thiểu không được âm.' };
  }
  if (input.maximum_salary !== undefined && input.maximum_salary < 0) {
    return { success: false, error: 'Lương tối đa không được âm.' };
  }
  if (input.minimum_salary !== undefined && input.maximum_salary !== undefined
    && input.minimum_salary > input.maximum_salary) {
    return { success: false, error: 'Lương tối thiểu không được lớn hơn lương tối đa.' };
  }

  // Validate tiers for TIERED_STUDENT_COUNT
  if (input.calculation_type === 'TIERED_STUDENT_COUNT') {
    if (!input.tiers || input.tiers.length === 0) {
      return { success: false, error: 'Phải có ít nhất một bậc cho quy tắc theo bậc học viên.' };
    }
    for (const tier of input.tiers) {
      if (tier.min_students < 0) {
        return { success: false, error: 'Số học viên tối thiểu không được âm.' };
      }
      if (tier.amount < 0) {
        return { success: false, error: 'Số tiền bậc không được âm.' };
      }
    }
  }

  // Validate percentage for PERCENT_REVENUE
  if (input.calculation_type === 'PERCENT_REVENUE') {
    if (input.percentage === undefined || input.percentage < 0 || input.percentage > 100) {
      return { success: false, error: 'Phần trăm phải từ 0 đến 100.' };
    }
  }

  // Check for conflicts
  const { data: conflicts } = await supabase.rpc('check_salary_rule_conflicts', {
    p_organization_id: orgId,
    p_scope_type: input.scope_type,
    p_scope_venue_id: input.scope_venue_id || null,
    p_scope_class_id: input.scope_class_id || null,
    p_scope_coach_id: input.scope_coach_id || null,
    p_scope_coach_role: input.scope_coach_role || null,
    p_scope_class_type: input.scope_class_type || null,
    p_calculation_type: input.calculation_type,
    p_priority: input.priority,
    p_effective_from: input.effective_from,
    p_effective_to: input.effective_to || null,
    p_exclude_rule_id: null,
  });

  if (conflicts && conflicts.length > 0) {
    const conflictNames = conflicts.map((c: RuleConflict) => c.conflict_rule_name).join(', ');
    return {
      success: false,
      error: `Phát hiện xung đột với quy tắc: ${conflictNames}. Hãy thay đổi priority hoặc phạm vi.`,
      conflicts: conflicts as RuleConflict[],
    };
  }

  // Create the rule
  const { data: rule, error: ruleError } = await supabase
    .from('salary_rules')
    .insert({
      organization_id: orgId,
      name: input.name,
      description: input.description || null,
      calculation_type: input.calculation_type,
      scope_type: input.scope_type,
      scope_venue_id: input.scope_venue_id || null,
      scope_class_id: input.scope_class_id || null,
      scope_coach_id: input.scope_coach_id || null,
      scope_coach_role: input.scope_coach_role || null,
      scope_class_type: input.scope_class_type || null,
      merge_mode: input.merge_mode,
      priority: input.priority,
      amount: input.amount,
      percentage: input.percentage || null,
      revenue_source: input.revenue_source || 'COLLECTED_REVENUE',
      minimum_salary: input.minimum_salary ?? null,
      maximum_salary: input.maximum_salary ?? null,
      condition_days_of_week: input.condition_days_of_week || null,
      condition_start_time: input.condition_start_time || null,
      condition_end_time: input.condition_end_time || null,
      bonus_condition_type: input.bonus_condition_type || null,
      bonus_condition_threshold: input.bonus_condition_threshold || null,
      effective_from: input.effective_from,
      effective_to: input.effective_to || null,
      status: 'active',
      created_by: context.profile?.id || null,
    })
    .select()
    .single();

  if (ruleError) return { success: false, error: ruleError.message };

  // Create tiers if TIERED_STUDENT_COUNT
  if (input.calculation_type === 'TIERED_STUDENT_COUNT' && input.tiers && rule) {
    const tierInserts = input.tiers.map(tier => ({
      rule_id: rule.id,
      min_students: tier.min_students,
      max_students: tier.max_students ?? null,
      amount: tier.amount,
    }));

    const { error: tierError } = await supabase
      .from('salary_rule_tiers')
      .insert(tierInserts);

    if (tierError) {
      // Rollback: delete the rule
      await supabase.from('salary_rules').delete().eq('id', rule.id);
      return { success: false, error: `Lỗi tạo bậc: ${tierError.message}` };
    }
  }

  // Auto-assign to coach profiles if specified
  if (input.assign_to_coach_ids && input.assign_to_coach_ids.length > 0 && rule) {
    const profileInserts = input.assign_to_coach_ids.map(coachId => ({
      organization_id: orgId,
      coach_id: coachId,
      rule_id: rule.id,
    }));

    await supabase.from('salary_profiles').insert(profileInserts);
  }

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: orgId,
    p_action: 'CREATE_RULE',
    p_target_type: 'salary_rule',
    p_target_id: rule?.id || null,
    p_actor_id: context.profile?.id || null,
    p_old_value: null,
    p_new_value: rule,
    p_reason: null,
  });

  revalidatePath('/payroll');
  return { success: true, ruleId: rule?.id };
}

export async function updateSalaryRuleAction(ruleId: string, input: Partial<CreateSalaryRuleInput>) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const orgId = context.organization.id;
  const supabase = await createClient();

  // Fetch existing rule
  const { data: existingRule } = await supabase
    .from('salary_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('organization_id', orgId)
    .single();

  if (!existingRule) return { success: false, error: 'Rule not found.' };

  // Check if rule has been used in approved/paid sessions
  // If so, we should close the old rule and create a new version
  const { count: usedCount } = await supabase
    .from('class_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('status', ['approved', 'paid'])
    .not('salary_config_snapshot', 'is', null);

  // For now, simple update if not locked by payroll
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Only update provided fields
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.percentage !== undefined) updateData.percentage = input.percentage;
  if (input.merge_mode !== undefined) updateData.merge_mode = input.merge_mode;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.minimum_salary !== undefined) updateData.minimum_salary = input.minimum_salary;
  if (input.maximum_salary !== undefined) updateData.maximum_salary = input.maximum_salary;
  if (input.condition_days_of_week !== undefined) updateData.condition_days_of_week = input.condition_days_of_week;
  if (input.condition_start_time !== undefined) updateData.condition_start_time = input.condition_start_time;
  if (input.condition_end_time !== undefined) updateData.condition_end_time = input.condition_end_time;
  if (input.effective_to !== undefined) updateData.effective_to = input.effective_to;

  const { error } = await supabase
    .from('salary_rules')
    .update(updateData)
    .eq('id', ruleId)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Update tiers if provided
  if (input.tiers !== undefined && existingRule.calculation_type === 'TIERED_STUDENT_COUNT') {
    // Delete old tiers
    await supabase.from('salary_rule_tiers').delete().eq('rule_id', ruleId);

    // Insert new tiers
    if (input.tiers && input.tiers.length > 0) {
      const tierInserts = input.tiers.map(tier => ({
        rule_id: ruleId,
        min_students: tier.min_students,
        max_students: tier.max_students ?? null,
        amount: tier.amount,
      }));
      await supabase.from('salary_rule_tiers').insert(tierInserts);
    }
  }

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: orgId,
    p_action: 'UPDATE_RULE',
    p_target_type: 'salary_rule',
    p_target_id: ruleId,
    p_actor_id: context.profile?.id || null,
    p_old_value: existingRule,
    p_new_value: updateData,
    p_reason: null,
  });

  revalidatePath('/payroll');
  return { success: true };
}

export async function deactivateSalaryRuleAction(ruleId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const orgId = context.organization.id;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('salary_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('organization_id', orgId)
    .single();

  if (!existing) return { success: false, error: 'Rule not found.' };

  const { error } = await supabase
    .from('salary_rules')
    .update({
      status: 'inactive',
      effective_to: getBusinessDateString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: orgId,
    p_action: 'DEACTIVATE_RULE',
    p_target_type: 'salary_rule',
    p_target_id: ruleId,
    p_actor_id: context.profile?.id || null,
    p_old_value: existing,
    p_new_value: { status: 'inactive' },
    p_reason: null,
  });

  revalidatePath('/payroll');
  return { success: true };
}

// ============================================================
// SALARY PROFILES — Link/Unlink Rules to Coaches
// ============================================================

export async function assignRuleToCoachAction(coachId: string, ruleId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('salary_profiles').insert({
    organization_id: context.organization.id,
    coach_id: coachId,
    rule_id: ruleId,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Quy tắc này đã được gán cho HLV.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/payroll');
  return { success: true };
}

export async function unassignRuleFromCoachAction(coachId: string, ruleId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('salary_profiles')
    .delete()
    .eq('coach_id', coachId)
    .eq('rule_id', ruleId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/payroll');
  return { success: true };
}

// ============================================================
// SALARY ADJUSTMENTS
// ============================================================

export async function createAdjustmentAction(data: {
  coachId: string;
  adjustmentType: 'BONUS' | 'ALLOWANCE' | 'DEDUCTION' | 'CORRECTION';
  amount: number;
  reason: string;
  sessionId?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  if (!data.reason || data.reason.trim().length === 0) {
    return { success: false, error: 'Phải có lý do cho điều chỉnh.' };
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Số tiền phải lớn hơn 0.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('salary_adjustments').insert({
    organization_id: context.organization.id,
    coach_id: data.coachId,
    session_id: data.sessionId || null,
    adjustment_type: data.adjustmentType,
    amount: data.amount,
    reason: data.reason,
    status: 'pending',
    created_by: context.profile?.id || null,
  });

  if (error) return { success: false, error: error.message };

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: context.organization.id,
    p_action: 'CREATE_ADJUSTMENT',
    p_target_type: 'salary_adjustment',
    p_target_id: null,
    p_actor_id: context.profile?.id || null,
    p_old_value: null,
    p_new_value: data,
    p_reason: data.reason,
  });

  revalidatePath('/payroll');
  return { success: true };
}

// ============================================================
// SALARY PREVIEW
// ============================================================

export async function previewSalaryAction(params: {
  venueId?: string;
  classId?: string;
  coachId?: string;
  coachRole?: 'HEAD_COACH' | 'ASSISTANT_COACH';
  classType?: string;
  studentCount: number;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };

  // Dynamic import to avoid circular deps
  const { previewSalaryCalculation } = await import('@/services/salary-engine.service');

  const result = await previewSalaryCalculation(context.organization.id, {
    venueId: params.venueId,
    classId: params.classId,
    coachId: params.coachId,
    coachRole: params.coachRole,
    classType: params.classType as any,
    studentCount: params.studentCount,
    dayOfWeek: params.dayOfWeek,
    startTime: params.startTime,
    endTime: params.endTime,
  });

  return { success: true, result };
}

// ============================================================
// FETCH SALARY RULES (for server component use)
// ============================================================

export async function getSalaryRulesAction() {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied', rules: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('salary_rules')
    .select('*, salary_rule_tiers(*), venues:scope_venue_id(id, name), venue_classes:scope_class_id(id, name), coaches:scope_coach_id(id, organization_members(profiles(name)))')
    .eq('organization_id', context.organization.id)
    .neq('status', 'archived')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message, rules: [] };

  // Transform coach names
  const rules = (data || []).map((rule: any) => ({
    ...rule,
    tiers: rule.salary_rule_tiers || [],
    scope_venue: rule.venues || null,
    scope_class: rule.venue_classes || null,
    scope_coach: rule.coaches ? {
      id: rule.coaches.id,
      name: rule.coaches.organization_members?.profiles?.name || 'Unknown',
    } : null,
  }));

  return { success: true, rules };
}
