import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useClasses(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: classes = [],
    isLoading: isClassesLoading,
    error: classesError,
  } = useQuery({
    queryKey: ['classes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('*, venues(name), class_coaches(*, coaches(id, organization_members(profiles(name)))), class_students(id, student_id, status, students(name, phone))')
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableCoaches = [],
    isLoading: isCoachesLoading,
  } = useQuery({
    queryKey: ['availableCoaches', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('coaches')
        .select('id, role, organization_members(profiles(name))')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Map to keep UI compatibility
      return (data || []).map((coach: any) => ({
        id: coach.id,
        role: coach.role,
        name: coach.organization_members?.profiles?.name || 'Unknown'
      }));
    },
    enabled: !!organizationId,
  });

  const {
    data: availableVenues = [],
    isLoading: isVenuesLoading,
  } = useQuery({
    queryKey: ['availableVenues', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableStudents = [],
    isLoading: isStudentsLoading,
  } = useQuery({
    queryKey: ['availableStudents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, phone, class_students(status)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    classes,
    availableCoaches,
    availableVenues,
    availableStudents,
    isLoading: isClassesLoading || isCoachesLoading || isVenuesLoading || isStudentsLoading,
    error: classesError,
  };
}
