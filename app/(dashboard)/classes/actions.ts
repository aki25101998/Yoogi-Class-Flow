'use server';

import { assignCoachToClass, removeCoachFromClass, changeCoachRole, CoachRole } from '@/services/class-coaches.service';
import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function assignCoachAction(classId: string, coachId: string, role: CoachRole) {
  return await assignCoachToClass(classId, coachId, role);
}

export async function changeCoachRoleAction(classId: string, coachId: string, newRole: CoachRole) {
  return await changeCoachRole(classId, coachId, newRole);
}

export async function removeCoachAction(classId: string, coachId: string) {
  return await removeCoachFromClass(classId, coachId);
}

export async function addClassAction(data: { name: string; venue_id: string; status: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên lớp học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  if (data.status === 'active') {
    return { success: false, error: 'Lớp đang hoạt động cần có ít nhất một lịch học. Vui lòng tạo lớp ở trạng thái "Tạm ngưng" và thêm lịch học trước khi kích hoạt.' };
  }

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) {
    return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
  }
  
  const { data: newClass, error } = await supabase.from('venue_classes').insert({
    organization_id: orgId,
    venue_id: data.venue_id,
    name: data.name.trim(),
    status: data.status,
    start_time: '18:00', // legacy default
    end_time: '20:00'
  }).select().single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/classes');
  return { success: true };
}

export async function updateClassAction(id: string, data: { name: string; venue_id: string; status: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên lớp học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Validate ACTIVE status requires at least one active schedule
  if (data.status === 'active') {
    const { data: activeSchedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('class_id', id)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .limit(1);
      
    if (!activeSchedules || activeSchedules.length === 0) {
      return { success: false, error: 'Lớp đang hoạt động cần có ít nhất một lịch học.' };
    }
  }

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) {
    return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
  }
  
  const { error } = await supabase.from('venue_classes')
    .update({
      name: data.name.trim(),
      venue_id: data.venue_id,
      status: data.status
    })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/classes');
  return { success: true };
}

export async function enrollStudentAction(classId: string, studentId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: student } = await supabase
    .from('students')
    .select('id, status')
    .eq('id', studentId)
    .eq('organization_id', orgId)
    .single();

  if (!student) {
    return { success: false, error: 'Học viên không tồn tại trong tổ chức này.' };
  }

  if (student.status !== 'active') {
    return { success: false, error: 'Học viên này hiện đang không hoạt động. Vui lòng kích hoạt lại trước khi đăng ký lớp.' };
  }

  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id, status')
    .eq('id', classId)
    .eq('organization_id', orgId)
    .single();

  if (!cls) {
    return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  }
  
  const { data: existing } = await supabase.from('class_students')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('organization_id', orgId)
    .single();

  if (existing) {
    const { error } = await supabase.from('class_students')
      .update({ status: 'active' })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from('class_students').insert({
      organization_id: orgId,
      class_id: classId,
      student_id: studentId,
      status: 'active'
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath('/classes');
  return { success: true };
}

export async function unenrollStudentAction(classId: string, studentId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('class_students')
    .update({ status: 'dropped' })
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/classes');
  return { success: true };
}

// === SCHEDULE MANAGEMENT ACTIONS (BYPASSING COACH) ===

export async function addScheduleToClassAction(data: {
  class_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_until?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  if (data.start_time >= data.end_time) {
    return { success: false, error: 'Giờ bắt đầu phải trước giờ kết thúc.' };
  }
  if (!data.days_of_week || data.days_of_week.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất một ngày trong tuần.' };
  }

  // Get venue_id from class
  const { data: cls } = await supabase.from('venue_classes').select('venue_id').eq('id', data.class_id).eq('organization_id', orgId).single();
  if (!cls) return { success: false, error: 'Lớp học không tồn tại.' };

  const venueId = cls.venue_id;

  // Check for Venue conflict and existing duplicate schedule
  for (const day of data.days_of_week) {
    // Duplicate check
    const { data: duplicate } = await supabase.from('schedules')
      .select('id')
      .eq('class_id', data.class_id)
      .eq('day_of_week', day)
      .eq('start_time', data.start_time)
      .eq('end_time', data.end_time)
      .eq('status', 'active')
      .eq('organization_id', orgId)
      .limit(1);

    if (duplicate && duplicate.length > 0) {
      return { success: false, error: `Lịch học thứ ${day === 0 ? 'CN' : day + 1} (${data.start_time}-${data.end_time}) đã tồn tại.` };
    }

    // Venue conflict check
    const { data: venueConflict } = await supabase.from('schedules')
      .select('id')
      .eq('venue_id', venueId)
      .eq('day_of_week', day)
      .eq('status', 'active')
      .eq('organization_id', orgId)
      .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`)
      .limit(1);

    if (venueConflict && venueConflict.length > 0) {
      return { success: false, error: `Phòng tập đã có lịch trùng giờ vào thứ ${day === 0 ? 'CN' : day + 1}.` };
    }
  }

  // Insert schedules
  const insertData = data.days_of_week.map(day => ({
    organization_id: orgId,
    class_id: data.class_id,
    venue_id: venueId,
    coach_id: null, // Coach is assigned later
    day_of_week: day,
    start_time: data.start_time,
    end_time: data.end_time,
    effective_from: data.effective_from || null,
    effective_until: data.effective_until || null,
    status: 'active'
  }));

  const { error } = await supabase.from('schedules').insert(insertData);
  if (error) return { success: false, error: error.message };

  revalidatePath('/classes');
  return { success: true };
}

export async function updateScheduleTimeAction(id: string, data: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_until?: string;
}) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  if (data.start_time >= data.end_time) {
    return { success: false, error: 'Giờ bắt đầu phải trước giờ kết thúc.' };
  }

  // Get current schedule info
  const { data: schedule } = await supabase.from('schedules')
    .select('class_id, venue_id, schedule_coaches(coach_id)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!schedule) return { success: false, error: 'Không tìm thấy lịch học.' };

  // Duplicate check
  const { data: duplicate } = await supabase.from('schedules')
    .select('id')
    .eq('class_id', schedule.class_id)
    .eq('day_of_week', data.day_of_week)
    .eq('start_time', data.start_time)
    .eq('end_time', data.end_time)
    .eq('status', 'active')
    .eq('organization_id', orgId)
    .neq('id', id)
    .limit(1);

  if (duplicate && duplicate.length > 0) {
    return { success: false, error: 'Lịch học với khung giờ này đã tồn tại trong lớp.' };
  }

  // Venue conflict check
  const { data: venueConflict } = await supabase.from('schedules')
    .select('id')
    .eq('venue_id', schedule.venue_id)
    .eq('day_of_week', data.day_of_week)
    .eq('status', 'active')
    .eq('organization_id', orgId)
    .neq('id', id)
    .or(`and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`)
    .limit(1);

  if (venueConflict && venueConflict.length > 0) {
    return { success: false, error: 'Phòng tập đã có lịch trùng giờ.' };
  }

  // Coach conflict check (if there are assigned coaches)
  const assignedCoachIds = schedule.schedule_coaches?.map(sc => sc.coach_id) || [];
  if (assignedCoachIds.length > 0) {
    const { data: coachConflict } = await supabase.from('schedule_coaches')
      .select('id, schedules!inner(day_of_week, start_time, end_time, status)')
      .in('coach_id', assignedCoachIds)
      .eq('organization_id', orgId)
      .eq('schedules.day_of_week', data.day_of_week)
      .eq('schedules.status', 'active')
      .neq('schedule_id', id)
      .or(`and(schedules.start_time.lte.${data.end_time},schedules.end_time.gte.${data.start_time})`)
      .limit(1);

    if (coachConflict && coachConflict.length > 0) {
      return { success: false, error: 'Lịch mới bị trùng với lịch cá nhân của HLV đang được phân công.' };
    }
  }

  const { error } = await supabase.from('schedules')
    .update({
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      effective_from: data.effective_from || null,
      effective_until: data.effective_until || null
    })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/classes');
  return { success: true };
}

export async function deleteScheduleFromClassAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('schedules')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/classes');
  return { success: true };
}
