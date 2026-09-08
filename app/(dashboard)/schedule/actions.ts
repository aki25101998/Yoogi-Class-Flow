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
  coach_ids?: string[]; // Optional for backward compatibility
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

  const coachIdsToProcess = data.coach_ids && data.coach_ids.length > 0 ? data.coach_ids : [data.coach_id];
  const primaryCoachId = coachIdsToProcess[0];

  // Verify all coaches belong to org and are active
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, status')
    .in('id', coachIdsToProcess)
    .eq('organization_id', orgId);

  if (!coaches || coaches.length !== coachIdsToProcess.length) {
    return { success: false, error: 'Một số HLV không tồn tại trong tổ chức này.' };
  }
  if (coaches.some(c => c.status !== 'active')) {
    return { success: false, error: 'Một số HLV đang không hoạt động.' };
  }

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
    .from('schedule_coaches')
    .select('id, schedule_id, schedules!inner(day_of_week, start_time, end_time, status)')
    .in('coach_id', coachIdsToProcess)
    .eq('organization_id', orgId)
    .eq('schedules.day_of_week', data.day_of_week)
    .eq('schedules.status', 'active')
    .or(`and(schedules.start_time.lte.${data.end_time},schedules.end_time.gte.${data.start_time})`);

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

  // Dual Write: Insert to schedules first
  const scheduleInsertData = {
    organization_id: orgId,
    coach_id: primaryCoachId,
    venue_id: data.venue_id,
    class_id: data.class_id,
    day_of_week: data.day_of_week,
    start_time: data.start_time,
    end_time: data.end_time,
    status: 'active'
  };

  const { data: insertedSchedule, error } = await supabase.from('schedules')
    .insert(scheduleInsertData)
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  
  // Insert to schedule_coaches
  const scheduleCoachesData = coachIdsToProcess.map(id => ({
    organization_id: orgId,
    schedule_id: insertedSchedule.id,
    coach_id: id
  }));

  const { error: coachesError } = await supabase.from('schedule_coaches').insert(scheduleCoachesData);
  if (coachesError) return { success: false, error: coachesError.message };

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
  coach_ids?: string[];
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

  const coachIdsToProcess = data.coach_ids && data.coach_ids.length > 0 ? data.coach_ids : [data.coach_id];
  const primaryCoachId = coachIdsToProcess[0];

  // Verify coach belongs to org and is active
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, status')
    .in('id', coachIdsToProcess)
    .eq('organization_id', orgId);

  if (!coaches || coaches.length !== coachIdsToProcess.length) {
    return { success: false, error: 'Một số HLV không tồn tại trong tổ chức này.' };
  }
  if (coaches.some(c => c.status !== 'active')) {
    return { success: false, error: 'Một số HLV đang không hoạt động.' };
  }

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
    .from('schedule_coaches')
    .select('id, schedule_id, schedules!inner(day_of_week, start_time, end_time, status)')
    .in('coach_id', coachIdsToProcess)
    .eq('organization_id', orgId)
    .eq('schedules.day_of_week', data.day_of_week)
    .eq('schedules.status', 'active')
    .neq('schedule_id', id)
    .or(`and(schedules.start_time.lte.${data.end_time},schedules.end_time.gte.${data.start_time})`);

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

  const scheduleUpdateData = {
    coach_id: primaryCoachId,
    venue_id: data.venue_id,
    class_id: data.class_id,
    day_of_week: data.day_of_week,
    start_time: data.start_time,
    end_time: data.end_time,
  };

  const { error } = await supabase.from('schedules')
    .update(scheduleUpdateData)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Dual Write: Sync schedule_coaches
  // 1. Delete old coaches
  await supabase.from('schedule_coaches').delete().eq('schedule_id', id);

  // 2. Insert new coaches
  const scheduleCoachesData = coachIdsToProcess.map(coachId => ({
    organization_id: orgId,
    schedule_id: id,
    coach_id: coachId
  }));

  await supabase.from('schedule_coaches').insert(scheduleCoachesData);
  
  revalidatePath('/schedule');
  return { success: true };
}
