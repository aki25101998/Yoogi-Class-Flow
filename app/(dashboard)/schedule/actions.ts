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
  const orgId = context.organization.id;

  // Validate time range
  if (data.start_time >= data.end_time) {
    return { success: false, error: 'Giờ bắt đầu phải trước giờ kết thúc.' };
  }

  // Validate day_of_week
  if (data.day_of_week < 0 || data.day_of_week > 6) {
    return { success: false, error: 'Ngày trong tuần không hợp lệ.' };
  }

  // Verify coach belongs to org and is active
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, status')
    .eq('id', data.coach_id)
    .eq('organization_id', orgId)
    .single();

  if (!coach) return { success: false, error: 'HLV không tồn tại trong tổ chức này.' };
  if (coach.status !== 'active') return { success: false, error: 'HLV đang không hoạt động.' };

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };

  // Verify class belongs to org
  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('id', data.class_id)
    .eq('organization_id', orgId)
    .single();

  if (!cls) return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  
  // Check for coach conflict
  const { data: coachConflict } = await supabase
    .from('schedules')
    .select('id')
    .eq('coach_id', data.coach_id)
    .eq('day_of_week', data.day_of_week)
    .eq('organization_id', orgId)
    .eq('status', 'active')
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
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`);

  if (venueConflict && venueConflict.length > 0) {
    return { success: false, error: 'Phòng tập/Địa điểm đã có lịch trùng giờ này.' };
  }

  const { error } = await supabase.from('schedules').insert({
    organization_id: orgId,
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
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/schedule');
  return { success: true };
}

export async function updateScheduleAction(id: string, data: {
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
  const orgId = context.organization.id;

  // Validate time range
  if (data.start_time >= data.end_time) {
    return { success: false, error: 'Giờ bắt đầu phải trước giờ kết thúc.' };
  }

  // Validate day_of_week
  if (data.day_of_week < 0 || data.day_of_week > 6) {
    return { success: false, error: 'Ngày trong tuần không hợp lệ.' };
  }

  // Verify coach belongs to org and is active
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, status')
    .eq('id', data.coach_id)
    .eq('organization_id', orgId)
    .single();

  if (!coach) return { success: false, error: 'HLV không tồn tại trong tổ chức này.' };
  if (coach.status !== 'active') return { success: false, error: 'HLV đang không hoạt động.' };

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };

  // Verify class belongs to org
  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('id', data.class_id)
    .eq('organization_id', orgId)
    .single();

  if (!cls) return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  
  // Check for coach conflict
  const { data: coachConflict } = await supabase
    .from('schedules')
    .select('id')
    .eq('coach_id', data.coach_id)
    .eq('day_of_week', data.day_of_week)
    .eq('status', 'active')
    .eq('organization_id', orgId)
    .neq('id', id)
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
    .eq('status', 'active')
    .eq('organization_id', orgId)
    .neq('id', id)
    .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`);

  if (venueConflict && venueConflict.length > 0) {
    return { success: false, error: 'Phòng tập/Địa điểm đã có lịch trùng giờ này.' };
  }

  const { error } = await supabase.from('schedules')
    .update(data)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/schedule');
  return { success: true };
}
