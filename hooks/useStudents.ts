import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useStudents(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: students = [],
    isLoading: isStudentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ['students', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*, class_students(id, class_id, venue_classes(name, start_time, end_time))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableClasses = [],
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['availableClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name, start_time, end_time')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    students,
    availableClasses,
    isLoading: isStudentsLoading || isClassesLoading,
    error: studentsError,
  };
}
