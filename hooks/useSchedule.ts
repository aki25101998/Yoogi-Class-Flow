import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useSchedule(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: schedules = [],
    isLoading: isSchedulesLoading,
  } = useQuery({
    queryKey: ['schedules', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('schedules')
        .select('*, venue_classes(name), coaches(name), venues(name)')
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['activeClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: coaches = [], isLoading: isCoachesLoading } = useQuery({
    queryKey: ['activeCoaches', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: venues = [], isLoading: isVenuesLoading } = useQuery({
    queryKey: ['activeVenues', organizationId],
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

  return {
    schedules,
    classes,
    coaches,
    venues,
    isLoading: isSchedulesLoading || isClassesLoading || isCoachesLoading || isVenuesLoading,
  };
}
