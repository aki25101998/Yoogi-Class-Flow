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
        .select('*, organization_belts(name), venues(name), class_students(id, class_id, status, venue_classes(name, venues(name)))')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out non-active classes
      const activeStudents = data?.map(student => ({
        ...student,
        class_students: student.class_students?.filter((cs: any) => cs.status === 'active') || []
      })) || [];
      
      return activeStudents;
    },
    enabled: !!organizationId,
  });

  const {
    data: availableClasses = [],
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['activeClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name, start_time, end_time, venues(name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableBelts = [],
    isLoading: isBeltsLoading,
  } = useQuery({
    queryKey: ['activeBelts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_belts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableVenues = [],
    isLoading: isVenuesLoading,
  } = useQuery({
    queryKey: ['activeVenues', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    students,
    availableClasses,
    availableBelts,
    availableVenues,
    isLoading: isStudentsLoading,
    error: studentsError,
  };
}
