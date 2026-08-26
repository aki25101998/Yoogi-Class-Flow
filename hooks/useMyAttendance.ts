import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useMyAttendance(organizationId: string | undefined, coachId: string | undefined) {
  const supabase = createClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['myAttendance', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId || !coachId) return [];
      const { data, error } = await supabase
        .from('teacher_salary_sessions')
        .select('*, venue_classes(name)')
        .eq('organization_id', organizationId)
        .eq('coach_id', coachId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!coachId,
  });

  return { sessions, isLoading };
}
