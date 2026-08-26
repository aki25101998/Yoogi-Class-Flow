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

  const supabase = await createClient();
  
  const { error } = await supabase.from('finance_transactions').insert({
    organization_id: context.organization.id,
    ...data
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/finance');
  return { success: true };
}

export async function deleteTransactionAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/finance');
  return { success: true };
}
