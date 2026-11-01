'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';
import { TuitionPaymentMethod } from '@/types/tuition';

export async function addTuitionAction(data: {
  student_id: string;
  class_id?: string | null;
  amount: number;
  due_date: string;
  notes?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền quản lý học phí.' };
  }

  if (!data.amount || data.amount <= 0 || !isFinite(data.amount)) {
    return { success: false, error: 'Số tiền học phí phải lớn hơn 0 và hợp lệ.' };
  }

  if (!data.due_date || typeof data.due_date !== 'string') {
    return { success: false, error: 'Kỳ thu học phí không hợp lệ.' };
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

  if (data.class_id) {
    const { data: cls } = await supabase
      .from('venue_classes')
      .select('id')
      .eq('id', data.class_id)
      .eq('organization_id', orgId)
      .single();

    if (!cls) {
      return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
    }
  }

  // Generate receipt_number: PT-YYYYMM-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const cleanDueDate = data.due_date.replace(/-/g, '');
  const receiptNumber = `PT-${cleanDueDate}-${randomSuffix}`;

  const { error } = await supabase.from('tuition').insert({
    organization_id: orgId,
    student_id: data.student_id,
    class_id: data.class_id || null,
    amount: data.amount,
    due_date: data.due_date,
    status: 'unpaid',
    paid_amount: 0,
    receipt_number: receiptNumber,
    notes: data.notes || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/tuition');
  return { success: true };
}

export async function createBatchTuitionAction(payload: {
  class_id: string;
  due_date: string;
  students: { student_id: string; amount: number; notes?: string }[];
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền tạo học phí hàng loạt.' };
  }

  if (!payload.students || payload.students.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 học viên để tạo học phí.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data, error } = await supabase.rpc('create_batch_tuition', {
    p_organization_id: orgId,
    p_class_id: payload.class_id || null,
    p_due_date: payload.due_date,
    p_students: payload.students,
  });

  if (error) return { success: false, error: error.message };

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Lỗi khi tạo học phí hàng loạt.' };
  }

  revalidatePath('/tuition');
  return { 
    success: true, 
    inserted_count: data?.inserted_count || 0,
    skipped_count: data?.skipped_count || 0
  };
}

export async function deleteTuitionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền xóa học phí.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: tuition } = await supabase
    .from('tuition')
    .select('paid_amount')
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

export async function recordPaymentAction(
  id: string, 
  paymentAmount: number, 
  paymentMethod: TuitionPaymentMethod = 'cash',
  notes?: string
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const role = context.membership?.role;
  const permissions = context.membership?.permissions || [];
  const canManage = role === 'owner' || role === 'admin' || permissions.includes('manage_tuition');

  if (!canManage) {
    return { success: false, error: 'Bạn không có quyền thu học phí.' };
  }

  if (!paymentAmount || paymentAmount <= 0 || !isFinite(paymentAmount)) {
    return { success: false, error: 'Số tiền thanh toán phải lớn hơn 0 và hợp lệ.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('record_tuition_payment', {
    p_tuition_id: id,
    p_amount: paymentAmount,
    p_organization_id: context.organization.id,
    p_payment_method: paymentMethod,
    p_created_by: context.profile?.id || null,
  });

  if (error) return { success: false, error: error.message };

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Lỗi khi xử lý thanh toán.' };
  }

  if (notes && notes.trim()) {
    await supabase
      .from('tuition')
      .update({ notes: notes.trim() })
      .eq('id', id)
      .eq('organization_id', context.organization.id);
  }

  revalidatePath('/tuition');
  revalidatePath('/finance');
  return { success: true, data };
}
