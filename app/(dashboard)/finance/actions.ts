'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';
import type { FinancePaymentMethod, FinanceTransactionType } from '@/types/finance';

export async function addTransactionAction(data: {
  type: FinanceTransactionType;
  category?: string;
  category_id?: string | null;
  amount: number;
  date: string;
  description?: string;
  venue_id?: string | null;
  payment_method?: FinancePaymentMethod;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && context.permissions.includes('manage_finance'));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền quản lý tài chính.' };
  }

  // Validate type
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    return { success: false, error: 'Loại giao dịch phải là "income" hoặc "expense".' };
  }

  // Validate amount
  if (!data.amount || data.amount <= 0 || !isFinite(data.amount)) {
    return { success: false, error: 'Số tiền phải lớn hơn 0 và hợp lệ.' };
  }

  // Validate date format (YYYY-MM-DD)
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { success: false, error: 'Ngày giao dịch không hợp lệ. Định dạng: YYYY-MM-DD.' };
  }

  // Validate category: either category_id or legacy category string must be present
  if (!data.category_id && (!data.category || data.category.trim().length === 0)) {
    return { success: false, error: 'Vui lòng chọn danh mục giao dịch.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  let parentCategoryName: string | null = null;
  let subCategoryName: string | null = data.category || null;

  if (data.category_id) {
    // Lookup category record to get parent name and subcategory name
    const { data: catRecord } = await supabase
      .from('finance_categories')
      .select('id, name, parent_id')
      .eq('id', data.category_id)
      .eq('organization_id', orgId)
      .single();

    if (catRecord) {
      if (catRecord.parent_id) {
        subCategoryName = catRecord.name;
        const { data: parentCat } = await supabase
          .from('finance_categories')
          .select('name')
          .eq('id', catRecord.parent_id)
          .eq('organization_id', orgId)
          .single();
        if (parentCat) {
          parentCategoryName = parentCat.name;
        }
      } else {
        parentCategoryName = catRecord.name;
        subCategoryName = catRecord.name;
      }
    }
  }

  const resolvedCategory = subCategoryName || parentCategoryName || data.category || 'Khác';
  const normalizedVenueId = data.venue_id && data.venue_id !== 'unassigned' && data.venue_id !== 'all' 
    ? data.venue_id 
    : null;
  const normalizedPaymentMethod = data.payment_method && ['cash', 'bank_transfer', 'other'].includes(data.payment_method)
    ? data.payment_method
    : 'cash';

  const { error } = await supabase.from('finance_transactions').insert({
    organization_id: orgId,
    type: data.type,
    category: resolvedCategory,
    category_id: data.category_id || null,
    parent_category: parentCategoryName,
    sub_category: subCategoryName,
    amount: data.amount,
    date: data.date,
    description: data.description || null,
    venue_id: normalizedVenueId,
    payment_method: normalizedPaymentMethod,
    source_type: 'MANUAL',
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/finance');
  return { success: true };
}

export async function deleteTransactionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && context.permissions.includes('manage_finance'));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền xóa giao dịch tài chính.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Block deletion of system-generated transactions (Tuition or Payroll)
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

export async function addCategoryAction(data: {
  parent_id?: string | null;
  name: string;
  type: FinanceTransactionType;
  icon?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền quản lý danh mục tài chính.' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên danh mục không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { error } = await supabase.from('finance_categories').insert({
    organization_id: orgId,
    parent_id: data.parent_id || null,
    name: data.name.trim(),
    type: data.type,
    icon: data.icon || (data.parent_id ? 'category' : 'folder'),
    is_system: false,
    display_order: 99,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}

export async function updateCategoryAction(
  id: string,
  data: { name: string; icon?: string; parent_id?: string | null }
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền chỉnh sửa danh mục tài chính.' };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên danh mục không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const updatePayload: Record<string, any> = {
    name: data.name.trim(),
    updated_at: new Date().toISOString(),
  };

  if (data.icon !== undefined) {
    updatePayload.icon = data.icon;
  }

  if (data.parent_id !== undefined) {
    updatePayload.parent_id = data.parent_id || null;
  }

  const { error } = await supabase
    .from('finance_categories')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) {
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('uq_finance_categories')) {
      if (error.message?.includes('parent_null')) {
        return { success: false, error: 'Tên nhóm danh mục này đã tồn tại.' };
      }
      return { success: false, error: 'Tên danh mục này đã tồn tại trong nhóm.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền xóa danh mục tài chính.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Check if category exists
  const { data: cat } = await supabase
    .from('finance_categories')
    .select('id, name')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!cat) {
    return { success: false, error: 'Không tìm thấy danh mục.' };
  }

  const { error } = await supabase
    .from('finance_categories')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}

export async function resetDefaultFinanceCategoriesAction() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasPermission = isAdminOrOwner || (context.permissions && (
    context.permissions.includes('manage_finance') || 
    context.permissions.includes('manage_settings')
  ));
  if (!hasPermission) {
    return { success: false, error: 'Bạn không có quyền đặt lại danh mục tài chính.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Xóa mục con trước, sau đó xóa nhóm cha để tránh lỗi ràng buộc
  const { error: childDeleteError } = await supabase
    .from('finance_categories')
    .delete()
    .eq('organization_id', orgId)
    .not('parent_id', 'is', null);

  if (childDeleteError) {
    return { success: false, error: `Lỗi khi dọn dẹp mục con: ${childDeleteError.message}` };
  }

  const { error: deleteError } = await supabase
    .from('finance_categories')
    .delete()
    .eq('organization_id', orgId);

  if (deleteError) {
    return { success: false, error: `Lỗi khi dọn dẹp danh mục cũ: ${deleteError.message}` };
  }

  // Gọi RPC nạp lại mẫu chuẩn hệ thống
  const { error: seedError } = await supabase.rpc('seed_default_finance_categories_for_org', {
    p_org_id: orgId,
  });

  if (seedError) {
    return { success: false, error: `Lỗi khi nạp danh mục mẫu: ${seedError.message}` };
  }

  revalidatePath('/finance');
  revalidatePath('/settings/finance-categories');
  return { success: true };
}
