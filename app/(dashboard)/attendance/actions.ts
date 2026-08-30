'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function saveAttendanceAction(classId: string, date: string, records: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // 1. Ensure class_session exists for this date and class
  let { data: session } = await supabase
    .from('class_sessions')
    .select('id, status')
    .eq('class_id', classId)
    .eq('date', date)
    .eq('organization_id', context.organization.id)
    .single();

  if (!session) {
    // Need to fetch original coach and schedule to properly create a session if it doesn't exist
    const { data: schedule } = await supabase.from('schedules')
      .select('id, coach_id, start_time, end_time')
      .eq('class_id', classId)
      .eq('organization_id', context.organization.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    const { data: newSession, error: createError } = await supabase
      .from('class_sessions')
      .insert({
        organization_id: context.organization.id,
        class_id: classId,
        date: date,
        status: 'checked_in',
        schedule_id: schedule?.id || null,
        coach_id: schedule?.coach_id || null,
        original_coach_id: schedule?.coach_id || null,
        start_time: schedule?.start_time || null,
        end_time: schedule?.end_time || null,
      })
      .select('id, status')
      .single();
      
    if (createError) return { success: false, error: 'Cannot create session for attendance: ' + createError.message };
    session = newSession;
  }

  // 2. Lock attendance check
  if (session.status === 'approved' || session.status === 'paid') {
    return { success: false, error: 'Buổi học này đã chốt lương. Không thể sửa điểm danh.' };
  }

  // 3. Save attendance records to student_session_attendance
  // First, we upsert them (or delete and re-insert, but upsert is better)
  const attendanceInserts = records.map(r => ({
    organization_id: context.organization!.id,
    session_id: session.id,
    student_id: r.student_id,
    status: r.status === 'pending' ? 'present' : r.status, // Default pending to present in DB? Or just save as is
    note: r.note || '',
    marked_by: context.membership?.user_id || null,
    marked_at: new Date().toISOString()
  }));

  // We can delete existing ones for this session and insert, to handle un-enrolled students or changes cleanly.
  // Or use upsert. Upsert requires unique constraint on (session_id, student_id).
  const { error: upsertError } = await supabase
    .from('student_session_attendance')
    .upsert(attendanceInserts, { onConflict: 'session_id,student_id' });

  if (upsertError) return { success: false, error: upsertError.message };


  
  revalidatePath('/attendance');
  return { success: true };
}
