'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addVenueAction(data: { name: string; address?: string; status?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('venues').insert({
    organization_id: context.organization.id,
    name: data.name,
    address: data.address,
    status: data.status || 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/venues');
  return { success: true };
}

export async function updateVenueAction(id: string, data: { name: string; address?: string; status?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('venues')
    .update(data)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/venues');
  return { success: true };
}

export async function deleteVenueAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Kiểm tra lịch dạy
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id')
    .eq('venue_id', id)
    .limit(1);
    
  if (schedules && schedules.length > 0) {
    return { success: false, error: 'Không thể xóa: Địa điểm này đang có lịch dạy.' };
  }
  
  // Kiểm tra lớp học
  const { data: venueClasses } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('venue_id', id)
    .limit(1);
    
  if (venueClasses && venueClasses.length > 0) {
    return { success: false, error: 'Không thể xóa: Địa điểm này đang được liên kết với lớp học.' };
  }

  const { error } = await supabase.from('venues')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/venues');
  return { success: true };
}
