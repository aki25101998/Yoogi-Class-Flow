'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { calculateSessionSalary, calculateMonthlyPayroll } from '@/services/salary-engine.service';
import { revalidatePath } from 'next/cache';

/**
 * Approve a salary session — calculates salary using the Salary Engine,
 * stores the immutable snapshot, and marks the session as approved.
 */
export async function approveSalarySessionAction(sessionId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Fetch session to get coach_id and validate
  const { data: session } = await supabase
    .from('class_sessions')
    .select('id, coach_id, status, organization_id')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .single();

  if (!session) return { success: false, error: 'Session not found.' };
  if (session.status !== 'checked_in') {
    return { success: false, error: `Session không ở trạng thái chờ duyệt (hiện tại: ${session.status}).` };
  }
  if (!session.coach_id) {
    return { success: false, error: 'Session không có HLV được gán.' };
  }

  // Calculate salary using the Salary Engine
  const result = await calculateSessionSalary(sessionId, session.coach_id, orgId);

  // Update session with calculated salary and snapshot
  const { error } = await supabase
    .from('class_sessions')
    .update({
      status: 'approved',
      calculated_salary: result.final_amount,
      salary_config_snapshot: result.snapshot,
      approved_by: context.profile?.id || null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: orgId,
    p_action: 'APPROVE_PAYROLL',
    p_target_type: 'class_session',
    p_target_id: sessionId,
    p_actor_id: context.profile?.id || null,
    p_old_value: null,
    p_new_value: {
      calculated_salary: result.final_amount,
      breakdown_count: result.items.length,
    },
    p_reason: null,
  });

  revalidatePath('/payroll');
  return { success: true, salary: result };
}

/**
 * Reject a salary session.
 */
export async function rejectSalarySessionAction(sessionId: string, reason?: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: session } = await supabase
    .from('class_sessions')
    .select('id, status')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .single();

  if (!session) return { success: false, error: 'Session not found.' };
  if (session.status !== 'checked_in' && session.status !== 'approved') {
    return { success: false, error: 'Session không thể từ chối ở trạng thái hiện tại.' };
  }

  const { error } = await supabase
    .from('class_sessions')
    .update({
      status: 'rejected',
      rejected_by: context.profile?.id || null,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Audit log
  await supabase.rpc('log_salary_audit', {
    p_organization_id: orgId,
    p_action: 'REJECT_PAYROLL',
    p_target_type: 'class_session',
    p_target_id: sessionId,
    p_actor_id: context.profile?.id || null,
    p_old_value: { status: session.status },
    p_new_value: { status: 'rejected' },
    p_reason: reason || null,
  });

  revalidatePath('/payroll');
  return { success: true };
}

/**
 * Pay coach salary — calls the atomic RPC.
 * The 'amount' parameter from client is IGNORED; server calculates from approved sessions.
 */
export async function payCoachSalaryAction(coachId: string, _amount: number, sessionIds: string[]) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  if (!sessionIds || sessionIds.length === 0) {
    return { success: false, error: 'Không có buổi nào được chọn.' };
  }

  const supabase = await createClient();

  // Deduplicate session IDs
  const uniqueIds = Array.from(new Set(sessionIds));

  // Call atomic RPC (server calculates total from approved sessions)
  const { data, error } = await supabase.rpc('pay_approved_salary_sessions', {
    p_organization_id: context.organization.id,
    p_coach_id: coachId,
    p_session_ids: uniqueIds,
    p_created_by: context.profile?.id || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Failed to process payment' };
  }

  revalidatePath('/payroll');
  revalidatePath('/finance');
  return { success: true, data };
}

/**
 * Get monthly payroll summary for a coach.
 */
export async function getMonthlyPayrollAction(coachId: string, month: string) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };

  const result = await calculateMonthlyPayroll(coachId, month, context.organization.id);
  return { success: true, result };
}

/**
 * Bulk approve all checked_in sessions for a coach.
 */
export async function bulkApproveSessionsAction(sessionIds: string[]) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const results: { sessionId: string; success: boolean; error?: string }[] = [];

  for (const sessionId of sessionIds) {
    const result = await approveSalarySessionAction(sessionId);
    results.push({
      sessionId,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  revalidatePath('/payroll');
  return {
    success: failCount === 0,
    message: `Đã duyệt ${successCount}/${results.length} buổi.${failCount > 0 ? ` ${failCount} buổi thất bại.` : ''}`,
    results,
  };
}

/**
 * Legacy: update salary config (preserved for backward compatibility).
 * Creates/updates salary rules instead of the old teacher_salaries table.
 */
export async function updateSalaryConfigAction(coachId: string, perSession: number, perStudent: number) {
  const context = await getCurrentOrganizationContext();
  if (!context?.organization) return { success: false, error: 'Access Denied' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied.' };
  }

  const orgId = context.organization.id;
  const supabase = await createClient();

  // Also update the legacy teacher_salaries for backward compatibility
  const { data: existing } = await supabase.from('teacher_salaries')
    .select('id')
    .eq('coach_id', coachId)
    .eq('organization_id', orgId)
    .single();

  if (existing) {
    await supabase.from('teacher_salaries')
      .update({ per_session: perSession, per_student: perStudent, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('teacher_salaries')
      .insert({
        organization_id: orgId,
        coach_id: coachId,
        per_session: perSession,
        per_student: perStudent,
      });
  }

  // Upsert salary rules: find existing coach-specific FIXED_PER_SESSION rule
  const { data: existingSessionRule } = await supabase
    .from('salary_rules')
    .select('id')
    .eq('organization_id', orgId)
    .eq('scope_coach_id', coachId)
    .eq('calculation_type', 'FIXED_PER_SESSION')
    .eq('status', 'active')
    .single();

  if (existingSessionRule) {
    await supabase.from('salary_rules')
      .update({ amount: perSession, updated_at: new Date().toISOString() })
      .eq('id', existingSessionRule.id);
  } else if (perSession > 0) {
    const { data: newRule } = await supabase.from('salary_rules').insert({
      organization_id: orgId,
      name: `Lương theo buổi — HLV`,
      calculation_type: 'FIXED_PER_SESSION',
      scope_type: 'COACH',
      scope_coach_id: coachId,
      merge_mode: 'ADD',
      priority: 40,
      amount: perSession,
      effective_from: new Date().toISOString().split('T')[0],
      status: 'active',
      created_by: context.profile?.id || null,
    }).select().single();

    if (newRule) {
      await supabase.from('salary_profiles').insert({
        organization_id: orgId,
        coach_id: coachId,
        rule_id: newRule.id,
      });
    }
  }

  // Upsert PER_STUDENT rule
  const { data: existingStudentRule } = await supabase
    .from('salary_rules')
    .select('id')
    .eq('organization_id', orgId)
    .eq('scope_coach_id', coachId)
    .eq('calculation_type', 'PER_STUDENT')
    .eq('status', 'active')
    .single();

  if (existingStudentRule) {
    await supabase.from('salary_rules')
      .update({ amount: perStudent, updated_at: new Date().toISOString() })
      .eq('id', existingStudentRule.id);
  } else if (perStudent > 0) {
    const { data: newRule } = await supabase.from('salary_rules').insert({
      organization_id: orgId,
      name: `Lương theo học viên — HLV`,
      calculation_type: 'PER_STUDENT',
      scope_type: 'COACH',
      scope_coach_id: coachId,
      merge_mode: 'ADD',
      priority: 40,
      amount: perStudent,
      effective_from: new Date().toISOString().split('T')[0],
      status: 'active',
      created_by: context.profile?.id || null,
    }).select().single();

    if (newRule) {
      await supabase.from('salary_profiles').insert({
        organization_id: orgId,
        coach_id: coachId,
        rule_id: newRule.id,
      });
    }
  }

  revalidatePath('/payroll');
  return { success: true };
}
