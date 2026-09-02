'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function getBeltsAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  // Ensure we don't return cached data by using Supabase, Next.js cache can be tricky but usually this is dynamic
  const { data, error } = await supabase
    .from('organization_belts')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true }); // Secondary sort fallback

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function addBeltAction(data: { name: string; is_active: boolean }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên cấp đai không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // 1. Get MAX(display_order)
  const { data: maxOrderData, error: maxError } = await supabase
    .from('organization_belts')
    .select('display_order')
    .eq('organization_id', orgId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  let newDisplayOrder = 1;
  if (!maxError && maxOrderData) {
    newDisplayOrder = maxOrderData.display_order + 1;
  }

  // 2. Insert with newDisplayOrder
  const { data: createdBelt, error } = await supabase.from('organization_belts').insert({
    name: data.name.trim(),
    display_order: newDisplayOrder,
    is_active: data.is_active,
    organization_id: orgId
  }).select().single();

  if (error) {
    console.error('addBeltAction error:', error);
    return { success: false, error: 'Không thể thêm cấp đai. Lỗi hệ thống hoặc sai quyền.' };
  }
  
  revalidatePath('/settings/belts');
  return { success: true, data: createdBelt };
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
  const orgId = context.organization.id;

  // Handle display_order collision safely
  if (safeData.display_order !== undefined) {
    const { data: currentBelt } = await supabase.from('organization_belts').select('display_order').eq('id', id).single();
    if (currentBelt && currentBelt.display_order !== safeData.display_order) {
      const oldOrder = currentBelt.display_order;
      const newOrder = safeData.display_order;
      
      // Temporary move out of the way
      await supabase.from('organization_belts').update({ display_order: -1 }).eq('id', id);
      
      // Shift other belts to avoid unique constraint violations
      if (newOrder < oldOrder) {
        // Shifting down (display_order increases), must update from bottom up (descending)
        const { data: beltsToShift } = await supabase.from('organization_belts')
          .select('id, display_order')
          .eq('organization_id', orgId)
          .gte('display_order', newOrder)
          .lt('display_order', oldOrder)
          .order('display_order', { ascending: false });
          
        for (const b of beltsToShift || []) {
          await supabase.from('organization_belts').update({ display_order: b.display_order + 1 }).eq('id', b.id);
        }
      } else {
        // Shifting up (display_order decreases), must update from top down (ascending)
        const { data: beltsToShift } = await supabase.from('organization_belts')
          .select('id, display_order')
          .eq('organization_id', orgId)
          .gt('display_order', oldOrder)
          .lte('display_order', newOrder)
          .order('display_order', { ascending: true });
          
        for (const b of beltsToShift || []) {
          await supabase.from('organization_belts').update({ display_order: b.display_order - 1 }).eq('id', b.id);
        }
      }
    }
  }

  const { data: updatedBelt, error } = await supabase.from('organization_belts')
    .update(safeData)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) {
    console.error('updateBeltAction error:', error);
    return { success: false, error: 'Không thể sửa cấp đai. Lỗi hệ thống hoặc sai quyền.' };
  }
  
  revalidatePath('/settings/belts');
  return { success: true, data: updatedBelt };
}

export async function deleteBeltAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

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
  
  // Normalize remaining belts order
  const { data: remainingBelts } = await supabase.from('organization_belts')
    .select('id, display_order')
    .eq('organization_id', orgId)
    .order('display_order', { ascending: true });

  if (remainingBelts) {
    for (let i = 0; i < remainingBelts.length; i++) {
      if (remainingBelts[i].display_order !== i + 1) {
        await supabase.from('organization_belts').update({ display_order: i + 1 }).eq('id', remainingBelts[i].id);
      }
    }
  }

  revalidatePath('/settings/belts');
  return { success: true };
}
