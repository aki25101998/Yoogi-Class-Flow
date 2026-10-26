'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

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
