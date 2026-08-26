import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import AttendanceClient from './AttendanceClient';

export default async function AttendancePage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get active classes and their students
  const { data: classes } = await supabase
    .from('venue_classes')
    .select('*, class_students(student_id, students(name))')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Get recent attendance logs (e.g. past 30 days) to prepopulate UI if needed
  const { data: allStudentAttendance } = await supabase
    .from('student_attendance')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('date', { ascending: false })
    .limit(100);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Điểm danh học viên</h1>
      <AttendanceClient 
        classes={classes || []} 
        allStudentAttendance={allStudentAttendance || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
