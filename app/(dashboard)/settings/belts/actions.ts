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

  const supabase = await createClient();
  const { error } = await supabase.from('organization_belts').insert({
    organization_id: context.organization.id,
    ...data
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/settings/belts');
  return { success: true };
}

export async function updateBeltAction(id: string, data: { name?: string; display_order?: number; is_active?: boolean }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const { error } = await supabase.from('organization_belts')
    .update(data)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/settings/belts');
  return { success: true };
}

export async function deleteBeltAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const { error } = await supabase.from('organization_belts')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/settings/belts');
  return { success: true };
}
