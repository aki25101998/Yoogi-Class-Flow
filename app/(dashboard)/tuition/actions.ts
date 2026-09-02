'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addTuitionAction(data: { student_id: string; class_id: string; amount: number; due_date: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  // Validate amount
  if (!data.amount || data.amount <= 0 || !isFinite(data.amount)) {
    return { success: false, error: 'Số tiền học phí phải lớn hơn 0 và hợp lệ.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify student belongs to org
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', data.student_id)
    .eq('organization_id', orgId)
    .single();

  if (!student) {
    return { success: false, error: 'Học viên không tồn tại trong tổ chức này.' };
  }

  // Verify class belongs to org
  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('id', data.class_id)
    .eq('organization_id', orgId)
    .single();

  if (!cls) {
    return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  }
  
  const { error } = await supabase.from('tuition').insert({
    organization_id: orgId,
    student_id: data.student_id,
    class_id: data.class_id,
    amount: data.amount,
    due_date: data.due_date,
    status: 'unpaid',
    paid_amount: 0
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/tuition');
  return { success: true };
}

export async function deleteTuitionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  // §5.5 — Block delete if any payment has been made
  const { data: tuition } = await supabase
    .from('tuition')
    .select('id, paid_amount')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!tuition) {
    return { success: false, error: 'Không tìm thấy khoản học phí.' };
  }

  if (Number(tuition.paid_amount) > 0) {
    return { success: false, error: 'Không thể xóa khoản học phí đã có thanh toán. Vui lòng liên hệ quản trị viên.' };
  }
  
  const { error } = await supabase.from('tuition')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/tuition');
  return { success: true };
}

/**
 * Record tuition payment via atomic RPC.
 * The RPC handles: row locking, overpayment check, 
 * atomic tuition update + finance transaction creation.
 */
export async function recordPaymentAction(id: string, paymentAmount: number) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  // Application-level validation for UX
  if (!paymentAmount || paymentAmount <= 0 || !isFinite(paymentAmount)) {
    return { success: false, error: 'Số tiền thanh toán phải lớn hơn 0 và hợp lệ.' };
  }

  const supabase = await createClient();
  
  // §5.1–5.4 — Call atomic RPC instead of separate queries
  const { data, error } = await supabase.rpc('record_tuition_payment', {
    p_tuition_id: id,
    p_amount: paymentAmount,
    p_organization_id: context.organization.id,
    p_created_by: context.profile?.id || null,
  });

  if (error) return { success: false, error: error.message };
  
  if (data && data.success === false) {
    return { success: false, error: data.error || 'Lỗi khi xử lý thanh toán.' };
  }
  
  revalidatePath('/tuition');
  revalidatePath('/finance');
  return { success: true };
}
