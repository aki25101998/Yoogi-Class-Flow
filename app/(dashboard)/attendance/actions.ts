'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function saveAttendanceAction(sessionId: string, records: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!sessionId) {
    return { success: false, error: 'Thiếu thông tin ca học. Vui lòng chọn ca học hợp lệ.' };
  }

  const supabase = await createClient();

  // 1. Find session by sessionId and validate organization
  const { data: session, error: sessionError } = await supabase
    .from('class_sessions')
    .select('id, status, class_id, schedule_id, coach_id, date')
    .eq('id', sessionId)
    .eq('organization_id', context.organization.id)
    .single();

  if (sessionError || !session) {
    return { success: false, error: 'Không tìm thấy ca học hoặc bạn không có quyền truy cập.' };
  }

  // 2. Lock attendance check
  if (session.status === 'approved' || session.status === 'paid' || session.status === 'cancelled') {
    return { success: false, error: `Buổi học này có trạng thái "${session.status}". Không thể sửa điểm danh.` };
  }

  // 3. Save attendance records to student_session_attendance
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
