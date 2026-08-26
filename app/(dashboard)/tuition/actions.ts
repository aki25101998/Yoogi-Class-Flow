'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addTuitionAction(data: { student_id: string; class_id: string; amount: number; due_date: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('tuition').insert({
    organization_id: context.organization.id,
    ...data,
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
  
  // Also delete related finance transactions? The user says not to create duplicate transactions.
  // A simple cascade delete could be set up, but let's just delete the tuition for now.
  const { error } = await supabase.from('tuition')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/tuition');
  return { success: true };
}

export async function recordPaymentAction(id: string, paymentAmount: number) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data: tuition } = await supabase
    .from('tuition')
    .select('*')
    .eq('id', id)
    .single();
    
  if (!tuition) return { success: false, error: 'Không tìm thấy khoản học phí' };
  
  const newPaidAmount = Number(tuition.paid_amount) + Number(paymentAmount);
  let newStatus = 'unpaid';
  if (newPaidAmount >= Number(tuition.amount)) newStatus = 'paid';
  else if (newPaidAmount > 0) newStatus = 'partial';
  
  const { error: updateError } = await supabase
    .from('tuition')
    .update({ paid_amount: newPaidAmount, status: newStatus })
    .eq('id', id);
    
  if (updateError) return { success: false, error: updateError.message };
  
  // Insert into finance_transactions
  await supabase.from('finance_transactions').insert({
    organization_id: context.organization.id,
    type: 'income',
    category: 'tuition',
    amount: paymentAmount,
    date: new Date().toISOString().split('T')[0],
    description: `Thanh toán học phí cho ID: ${id}`,
    reference_id: id
  });
  
  revalidatePath('/tuition');
  return { success: true };
}
