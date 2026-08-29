'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function updateOrganizationAction(data: { name: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  // Only owner or admin should be able to update org settings
  if (context.membership?.role !== 'owner' && context.membership?.role !== 'admin') {
    return { success: false, error: 'Chỉ Admin hoặc Chủ sở hữu mới có quyền cập nhật.' };
  }

  const supabase = await createClient();
  
  const { error } = await supabase.from('organizations')
    .update(data)
    .eq('id', context.organization.id);

  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings');
  return { success: true };
}
