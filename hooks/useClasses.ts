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
        .select('*, class_coaches(*, coaches(id, organization_members(profiles(name))))')
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

  return {
    classes,
    availableCoaches,
    isLoading: isClassesLoading || isCoachesLoading,
    error: classesError,
  };
}
