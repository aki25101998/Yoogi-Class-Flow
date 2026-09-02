'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addTransactionAction(data: {
  type: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  // §6.1 — Validate type
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    return { success: false, error: 'Loại giao dịch phải là "income" hoặc "expense".' };
  }

  // §6.2 — Validate amount
  if (!data.amount || data.amount <= 0 || !isFinite(data.amount)) {
    return { success: false, error: 'Số tiền phải lớn hơn 0 và hợp lệ.' };
  }

  // Validate date format (basic YYYY-MM-DD check)
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { success: false, error: 'Ngày giao dịch không hợp lệ. Định dạng: YYYY-MM-DD.' };
  }

  // Validate category is not empty
  if (!data.category || data.category.trim().length === 0) {
    return { success: false, error: 'Phải chọn danh mục giao dịch.' };
  }

  const supabase = await createClient();
  
  const { error } = await supabase.from('finance_transactions').insert({
    organization_id: context.organization.id,
    type: data.type,
    category: data.category,
    amount: data.amount,
    date: data.date,
    description: data.description || null,
    source_type: 'MANUAL',
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/finance');
  return { success: true };
}

export async function deleteTransactionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  // §6.4 — Block deletion of system-generated transactions
  const { data: txn } = await supabase
    .from('finance_transactions')
    .select('id, source_type')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!txn) {
    return { success: false, error: 'Không tìm thấy giao dịch.' };
  }

  if (txn.source_type && txn.source_type !== 'MANUAL') {
    return { 
      success: false, 
      error: 'Không thể xóa giao dịch tự động tạo bởi hệ thống (học phí hoặc lương). Vui lòng hủy giao dịch gốc.' 
    };
  }
  
  const { error } = await supabase.from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/finance');
  return { success: true };
}
