'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addScheduleAction(data: {
  coach_id: string;
  venue_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Check for coach conflict
  const { data: coachConflict } = await supabase
    .from('schedules')
    .select('id')
    .eq('coach_id', data.coach_id)
    .eq('day_of_week', data.day_of_week)
    .eq('organization_id', context.organization.id)
    .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`);

  if (coachConflict && coachConflict.length > 0) {
    return { success: false, error: 'HLV đã có lịch dạy trùng giờ này.' };
  }

  // Check for venue conflict
  const { data: venueConflict } = await supabase
    .from('schedules')
    .select('id')
    .eq('venue_id', data.venue_id)
    .eq('day_of_week', data.day_of_week)
    .eq('organization_id', context.organization.id)
    .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`);

  if (venueConflict && venueConflict.length > 0) {
    return { success: false, error: 'Phòng tập/Địa điểm đã có lịch trùng giờ này.' };
  }

  const { error } = await supabase.from('schedules').insert({
    organization_id: context.organization.id,
    ...data,
    status: 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/schedule');
  return { success: true };
}

export async function deleteScheduleAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('schedules')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/schedule');
  return { success: true };
}
