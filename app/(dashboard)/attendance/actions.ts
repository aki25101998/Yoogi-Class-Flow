'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function saveAttendanceAction(classId: string, date: string, records: any[], scheduleId?: string, sessionId?: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  let session = null;

  // 1. Find session by sessionId
  if (sessionId) {
    const { data } = await supabase
      .from('class_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('organization_id', context.organization.id)
      .single();
    session = data;
  }

  // 2. Find by scheduleId
  if (!session && scheduleId) {
     const { data } = await supabase
      .from('class_sessions')
      .select('id, status')
      .eq('schedule_id', scheduleId)
      .eq('date', date)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
     session = data;
  }

  // 3. Fallback to classId + date ONLY IF there's exactly one session for that date (ad-hoc legacy fallback)
  if (!session && !scheduleId) {
     const { data } = await supabase
      .from('class_sessions')
      .select('id, status')
      .eq('class_id', classId)
      .eq('date', date)
      .eq('organization_id', context.organization.id)
      .maybeSingle();
     session = data;
  }

  // 4. Create new session if not found
  if (!session) {
    let coachId = null;
    let startTime = null;
    let endTime = null;

    if (scheduleId) {
      const { data: schedule } = await supabase.from('schedules')
        .select('coach_id, start_time, end_time')
        .eq('id', scheduleId)
        .single();
      if (schedule) {
        coachId = schedule.coach_id;
        startTime = schedule.start_time;
        endTime = schedule.end_time;
      }
    } else {
      const { data: schedule } = await supabase.from('schedules')
        .select('coach_id, start_time, end_time')
        .eq('class_id', classId)
        .eq('organization_id', context.organization.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (schedule) {
        coachId = schedule.coach_id;
        startTime = schedule.start_time;
        endTime = schedule.end_time;
      }
    }

    const { data: newSession, error: createError } = await supabase
      .from('class_sessions')
      .insert({
        organization_id: context.organization.id,
        class_id: classId,
        date: date,
        status: 'checked_in',
        schedule_id: scheduleId || null,
        coach_id: coachId,
        original_coach_id: coachId,
        start_time: startTime,
        end_time: endTime,
      })
      .select('id, status')
      .single();
      
    if (createError) return { success: false, error: 'Cannot create session for attendance: ' + createError.message };
    session = newSession;
  }

  // 5. Lock attendance check
  if (session.status === 'approved' || session.status === 'paid') {
    return { success: false, error: 'Buổi học này đã chốt lương. Không thể sửa điểm danh.' };
  }

  // 6. Save attendance records to student_session_attendance
  const attendanceInserts = records.map(r => ({
    organization_id: context.organization!.id,
    session_id: session.id,
    student_id: r.student_id,
    status: r.status === 'pending' ? 'present' : r.status,
    note: r.note || '',
    marked_by: context.membership?.user_id || null
    // marked_at is handled by DB DEFAULT NOW() to avoid UTC timezone issues
  }));

  const { error: upsertError } = await supabase
    .from('student_session_attendance')
    .upsert(attendanceInserts, { onConflict: 'session_id,student_id' });

  if (upsertError) return { success: false, error: upsertError.message };

  revalidatePath('/attendance');
  return { success: true };
}
