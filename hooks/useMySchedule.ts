import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useMySchedule(organizationId: string | undefined, coachId: string | undefined) {
  const supabase = createClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['mySchedule', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId || !coachId) return [];
      const { data, error } = await supabase
        .from('schedules')
        .select('*, venue_classes(name), venues(name)')
        .eq('organization_id', organizationId)
        .eq('coach_id', coachId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!coachId,
  });

  return { schedules, isLoading };
}
