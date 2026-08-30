import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useAttendance(organizationId: string | undefined, dateStr: string) {
  const supabase = createClient();

  // We should fetch today's active classes/schedules for this org.
  // To keep it simple and compatible, we fetch all active classes so the dropdown works.
  const {
    data: classes = [],
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['attendanceClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('*, class_students(student_id, students(name))')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: allStudentAttendance = [],
    isLoading: isAttendanceLoading,
  } = useQuery({
    queryKey: ['studentAttendance', organizationId, dateStr],
    queryFn: async () => {
      if (!organizationId || !dateStr) return [];
      
      // Fetch from class_sessions and student_session_attendance
      const { data: sessions, error } = await supabase
        .from('class_sessions')
        .select(`
          id,
          class_id,
          date,
          student_session_attendance(
            student_id,
            status,
            note
          )
        `)
        .eq('organization_id', organizationId)
        .eq('date', dateStr);
      
      if (error) throw error;
      
      // Transform into the shape the UI expects: { class_id, date, records: [] }
      return (sessions || []).map((session: any) => ({
        class_id: session.class_id,
        date: session.date,
        records: session.student_session_attendance
      }));
    },
    enabled: !!organizationId && !!dateStr,
  });

  return {
    classes,
    allStudentAttendance,
    isLoading: isClassesLoading || isAttendanceLoading,
  };
}
