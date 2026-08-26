import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useAttendance(organizationId: string | undefined) {
  const supabase = createClient();

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
    queryKey: ['studentAttendance', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    classes,
    allStudentAttendance,
    isLoading: isClassesLoading || isAttendanceLoading,
  };
}
