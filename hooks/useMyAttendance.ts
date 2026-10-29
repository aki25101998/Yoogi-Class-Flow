import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useMyAttendance(organizationId: string | undefined, coachId: string | undefined) {
  const supabase = createClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['myAttendance', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId || !coachId) return [];

      // 1. Get session_ids where coach is in session_coaches
      const { data: sessionCoaches } = await supabase
        .from('session_coaches')
        .select('session_id')
        .eq('organization_id', organizationId)
        .eq('coach_id', coachId);

      const sessionIds = (sessionCoaches || []).map((sc: any) => sc.session_id);

      // 2. Fetch class_sessions matching coach_id OR in sessionIds
      let query = supabase
        .from('class_sessions')
        .select('*, venue_classes(name, venue_id, venues(id, name))')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (sessionIds.length > 0) {
        query = query.or(`coach_id.eq.${coachId},id.in.(${sessionIds.join(',')})`);
      } else {
        query = query.eq('coach_id', coachId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!coachId,
  });

  return { sessions, isLoading };
}
