'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function getBeltsAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_belts')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('display_order', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function addBeltAction(data: { name: string; display_order: number; is_active: boolean }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên cấp đai không được để trống.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('organization_belts').insert({
    name: data.name.trim(),
    display_order: data.display_order,
    is_active: data.is_active,
    organization_id: context.organization.id
  });

  if (error) {
    console.error('addBeltAction error:', error);
    return { success: false, error: 'Không thể thêm cấp đai. Lỗi hệ thống hoặc sai quyền.' };
  }
  
  revalidatePath('/settings/belts');
  return { success: true };
}

export async function updateBeltAction(id: string, data: { name?: string; display_order?: number; is_active?: boolean }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const safeData = { ...data };
  delete (safeData as any).organization_id;

  if (safeData.name !== undefined && safeData.name.trim().length === 0) {
    return { success: false, error: 'Tên cấp đai không được để trống.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('organization_belts')
    .update(safeData)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) {
    console.error('updateBeltAction error:', error);
    return { success: false, error: 'Không thể sửa cấp đai. Lỗi hệ thống hoặc sai quyền.' };
  }
  
  revalidatePath('/settings/belts');
  return { success: true };
}

export async function deleteBeltAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // §11.1 — Block deletion if any student is using this belt
  const { count: studentsUsingBelt } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('current_belt_id', id)
    .eq('organization_id', orgId);

  if (studentsUsingBelt && studentsUsingBelt > 0) {
    return { 
      success: false, 
      error: `Không thể xóa: Có ${studentsUsingBelt} học viên đang sử dụng cấp đai này. Vui lòng hủy kích hoạt thay vì xóa.` 
    };
  }

  const { error } = await supabase.from('organization_belts')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) {
    console.error('deleteBeltAction error:', error);
    return { success: false, error: 'Không thể xóa cấp đai. Lỗi hệ thống hoặc sai quyền.' };
  }
  
  revalidatePath('/settings/belts');
  return { success: true };
}
