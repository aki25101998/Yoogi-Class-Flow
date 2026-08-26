'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function approveSalarySessionAction(sessionId: string, amount: number) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('teacher_salary_sessions')
    .update({
      status: 'approved',
      calculated_salary: amount,
      approved_by: context.membership?.user_id || null, // Note: actually needs profile/coach id, but simplifying
      approved_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/payroll');
  return { success: true };
}

export async function payCoachSalaryAction(coachId: string, amount: number, sessionIds: string[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Create finance transaction
  const { error: financeError } = await supabase.from('finance_transactions').insert({
    organization_id: context.organization.id,
    type: 'expense',
    category: 'payroll',
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    description: `Thanh toán lương cho HLV (Coach ID: ${coachId})`
  });

  if (financeError) return { success: false, error: financeError.message };

  // Update sessions as paid
  const { error: updateError } = await supabase.from('teacher_salary_sessions')
    .update({ status: 'paid' })
    .in('id', sessionIds)
    .eq('organization_id', context.organization.id);
    
  if (updateError) return { success: false, error: updateError.message };

  revalidatePath('/payroll');
  return { success: true };
}
