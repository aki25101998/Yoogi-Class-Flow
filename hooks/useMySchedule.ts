import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useMySchedule(organizationId: string | undefined, coachId: string | undefined) {
  const supabase = createClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['mySchedule', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId || !coachId) return [];

      // 1. Fetch class_ids where this coach is assigned in class_coaches
      const { data: classCoaches } = await supabase
        .from('class_coaches')
        .select('class_id')
        .eq('organization_id', organizationId)
        .eq('coach_id', coachId);
      
      const assignedClassIds = (classCoaches || []).map((c: any) => c.class_id);

      // 2. Fetch all active schedules with their coaches
      const { data, error } = await supabase
        .from('schedules')
        .select('*, venue_classes(name), venues(name), schedule_coaches(coach_id)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;

      // 3. Filter schedules where:
      // - coach is in schedule_coaches, OR
      // - schedules.coach_id = coachId, OR
      // - (schedule has no specific schedule_coaches assigned AND class_id is in assignedClassIds)
      const mySchedules = (data || []).filter((s: any) => {
        const hasScheduleCoach = s.schedule_coaches && s.schedule_coaches.length > 0;
        if (hasScheduleCoach) {
          return s.schedule_coaches.some((sc: any) => sc.coach_id === coachId);
        }
        if (s.coach_id) {
          return s.coach_id === coachId;
        }
        return assignedClassIds.includes(s.class_id);
      });

      return mySchedules;
    },
    enabled: !!organizationId && !!coachId,
  });

  return { schedules, isLoading };
}
