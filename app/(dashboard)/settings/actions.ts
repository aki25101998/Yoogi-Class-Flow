'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

function revalidateAllOrganizationPaths() {
  revalidatePath('/dashboard');
  revalidatePath('/training');
  revalidatePath('/coaches');
  revalidatePath('/students');
  revalidatePath('/schedule');
  revalidatePath('/attendance');
  revalidatePath('/tuition');
  revalidatePath('/finance');
  revalidatePath('/payroll');
  revalidatePath('/settings');
  revalidatePath('/settings/belts');
  revalidatePath('/settings/members');
  revalidatePath('/settings/version-history');
}

export async function updateOrganizationAction(data: { name: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  // Only owner or admin should be able to update org settings
  if (context.membership?.role !== 'owner' && context.membership?.role !== 'admin') {
    return { success: false, error: 'Chỉ Admin hoặc Chủ sở hữu mới có quyền cập nhật.' };
  }

  const supabase = await createClient();
  
  const { error } = await supabase.from('organizations')
    .update(data)
    .eq('id', context.organization.id);

  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings');
  return { success: true };
}

export async function seedSampleDataAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) {
    return { success: false, error: 'Không tìm thấy thông tin tổ chức. Vui lòng đăng nhập lại.' };
  }

  if (context.membership?.role !== 'owner' && context.membership?.role !== 'admin') {
    return { success: false, error: 'Chỉ Quản trị viên (Admin) hoặc Chủ sở hữu mới có quyền nạp dữ liệu mẫu.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // 1. Try calling the RPC function public.seed_sample_data
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('seed_sample_data', {
      p_target_org_id: orgId
    });

    if (!rpcError && rpcData?.success) {
      revalidateAllOrganizationPaths();
      return { 
        success: true, 
        message: 'Nạp dữ liệu mẫu thành công! Đã tạo 3 chi nhánh, 4 HLV, 6 lớp học, 16 học viên, 8 lịch học, buổi học thực tế, điểm danh, học phí và sổ quỹ.',
        data: rpcData
      };
    }
  } catch (rpcErr) {
    console.warn('RPC execution exception, proceeding to fallback:', rpcErr);
  }

  // 2. Fallback if RPC is not deployed yet in Supabase
  const { seedFallbackSampleData } = await import('@/services/seed.service');
  const fallbackResult = await seedFallbackSampleData(supabase, orgId, context.coach?.id);
  
  if (fallbackResult.success) {
    revalidateAllOrganizationPaths();
    return {
      success: true,
      message: fallbackResult.message || 'Nạp dữ liệu mẫu thành công!',
      isFallback: true
    };
  } else {
    return {
      success: false,
      error: fallbackResult.error || 'Có lỗi xảy ra khi nạp dữ liệu mẫu.'
    };
  }
}

export async function resetOrganizationDataAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) {
    return { success: false, error: 'Không tìm thấy thông tin tổ chức. Vui lòng đăng nhập lại.' };
  }

  if (context.membership?.role !== 'owner' && context.membership?.role !== 'admin') {
    return { success: false, error: 'Chỉ Quản trị viên (Admin) hoặc Chủ sở hữu mới có quyền xóa toàn bộ dữ liệu.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // 1. Try calling the RPC function public.reset_organization_data
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('reset_organization_data', {
      p_target_org_id: orgId
    });

    if (!rpcError && rpcData?.success) {
      revalidateAllOrganizationPaths();
      return { 
        success: true, 
        message: rpcData.message || 'Đã xóa toàn bộ dữ liệu tổ chức thành công!' 
      };
    }
    if (rpcData && rpcData.success === false) {
      if (rpcData.error?.includes('Chỉ Quản trị viên')) {
        return { success: false, error: rpcData.error };
      }
      console.warn('RPC reset unsuccessful in database, proceeding to robust fallback:', rpcData.error);
    }
  } catch (rpcErr) {
    console.warn('RPC reset exception, proceeding to fallback:', rpcErr);
  }

  // 2. Fallback step-by-step deletion if RPC is not available or outdated in database
  try {
    const ownerMemberId = context.membership.id;
    const ownerCoachId = context.coach?.id;

    // Use admin client if available, else standard authenticated supabase client
    let db = supabase;
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      db = createAdminClient();
    } catch {
      db = supabase;
    }

    // Delete in sequence to respect foreign keys
    await db.from('student_session_attendance').delete().eq('organization_id', orgId);
    await db.from('session_coaches').delete().eq('organization_id', orgId);
    await db.from('attendance').delete().eq('organization_id', orgId);
    await db.from('student_attendance').delete().eq('organization_id', orgId);
    await db.from('class_sessions').delete().eq('organization_id', orgId);

    await db.from('schedule_coaches').delete().eq('organization_id', orgId);
    await db.from('schedules').delete().eq('organization_id', orgId);

    await db.from('finance_transactions').delete().eq('organization_id', orgId);
    await db.from('tuition').delete().eq('organization_id', orgId);
    await db.from('payroll_payment_sessions').delete().eq('organization_id', orgId);
    await db.from('payroll_payments').delete().eq('organization_id', orgId);
    await db.from('payroll_periods').delete().eq('organization_id', orgId);
    await db.from('salary_adjustments').delete().eq('organization_id', orgId);
    await db.from('salary_profiles').delete().eq('organization_id', orgId);

    // salary_rule_tiers references salary_rules(id) via rule_id (it has no organization_id column)
    const { data: rules } = await db.from('salary_rules').select('id').eq('organization_id', orgId);
    if (rules && rules.length > 0) {
      const ruleIds = rules.map(r => r.id);
      await db.from('salary_rule_tiers').delete().in('rule_id', ruleIds);
    }
    await db.from('salary_rules').delete().eq('organization_id', orgId);
    await db.from('salary_audit_logs').delete().eq('organization_id', orgId);
    await db.from('teacher_salaries').delete().eq('organization_id', orgId);

    await db.from('class_students').delete().eq('organization_id', orgId);
    await db.from('students').delete().eq('organization_id', orgId);

    await db.from('class_coaches').delete().eq('organization_id', orgId);
    await db.from('venue_classes').delete().eq('organization_id', orgId);
    await db.from('venues').delete().eq('organization_id', orgId);

    await db.from('organization_belts').delete().eq('organization_id', orgId);
    await db.from('organization_invitations').delete().eq('organization_id', orgId);

    if (ownerCoachId) {
      await db.from('coaches').delete().eq('organization_id', orgId).neq('id', ownerCoachId);
    } else {
      await db.from('coaches').delete().eq('organization_id', orgId);
    }

    if (ownerMemberId) {
      await db.from('organization_members').delete().eq('organization_id', orgId).neq('id', ownerMemberId);
    } else {
      await db.from('organization_members').delete().eq('organization_id', orgId).neq('role', 'owner');
    }

    // Record in version history
    try {
      const { data: counter } = await db
        .from('organization_version_counters')
        .select('current_version')
        .eq('organization_id', orgId)
        .single();
      const nextVer = (counter?.current_version || 0) + 1;
      
      await db.from('version_history').insert({
        organization_id: orgId,
        version_number: nextVer,
        summary: 'Xóa toàn bộ dữ liệu tổ chức (Khôi phục trạng thái trắng khởi tạo)',
        action_type: 'RESTORE',
        created_by: context.profile.id
      });
      await db.from('organization_version_counters').upsert({
        organization_id: orgId,
        current_version: nextVer,
        updated_at: new Date().toISOString()
      });
    } catch (vhErr) {
      console.warn('Non-blocking: could not record reset in version history:', vhErr);
    }

    revalidateAllOrganizationPaths();
    return {
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu tổ chức thành công. Hệ thống đã trở về trạng thái khởi tạo sạch sẽ.'
    };
  } catch (err: any) {
    console.error('Reset fallback error:', err);
    return {
      success: false,
      error: err.message || 'Lỗi khi xóa dữ liệu tổ chức'
    };
  }
}
