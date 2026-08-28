import { useQuery } from '@tanstack/react-query';
import { fetchTodaySessionsAction } from '@/app/(dashboard)/dashboard/actions';
import { ClassSession } from '@/services/session.service';

export function useTodaySessions(organizationId: string | undefined, dateStr: string, coachId?: string) {
  const {
    data: sessions = [],
    isLoading,
    error,
    refetch
  } = useQuery<ClassSession[]>({
    queryKey: ['todaySessions', organizationId, dateStr, coachId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await fetchTodaySessionsAction(dateStr, coachId);
    },
    enabled: !!organizationId && !!dateStr,
  });

  return {
    sessions,
    isLoading,
    error,
    refetch
  };
}
