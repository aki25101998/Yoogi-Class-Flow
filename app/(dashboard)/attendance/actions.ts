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

  if (!records || records.length === 0) {
    return { success: false, error: 'Không có dữ liệu điểm danh.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // 1. Find session by sessionId and validate organization
  const { data: session, error: sessionError } = await supabase
    .from('class_sessions')
    .select('id, status, class_id, schedule_id, coach_id, date')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: 'Không tìm thấy ca học hoặc bạn không có quyền truy cập.' };
  }

  // 2. Lock attendance check
  if (session.status === 'approved' || session.status === 'paid' || session.status === 'cancelled') {
    return { success: false, error: `Buổi học này có trạng thái "${session.status}". Không thể sửa điểm danh.` };
  }

  // 3. §3.1 — Verify EACH student belongs to this class
  const studentIds = records.map((r: any) => r.student_id).filter(Boolean);
  if (studentIds.length === 0) {
    return { success: false, error: 'Không có học viên hợp lệ trong danh sách điểm danh.' };
  }

  // Fetch active class_students for this class
  const { data: classStudents } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', session.class_id)
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .in('student_id', studentIds);

  const validStudentIds = new Set((classStudents || []).map((cs: any) => cs.student_id));

  // Filter out students not in the class
  const invalidStudents = studentIds.filter((sid: string) => !validStudentIds.has(sid));
  if (invalidStudents.length > 0) {
    return { 
      success: false, 
      error: `${invalidStudents.length} học viên không thuộc lớp này hoặc đã rời lớp. Vui lòng tải lại danh sách.` 
    };
  }

  // 4. Save attendance records to student_session_attendance
  const attendanceInserts = records
    .filter((r: any) => validStudentIds.has(r.student_id))
    .map((r: any) => ({
      organization_id: orgId,
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
