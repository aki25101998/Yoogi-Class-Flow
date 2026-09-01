import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { fetchDashboardStats } from '@/hooks/useDashboardStats';

export const prefetchRouteData = (
  queryClient: QueryClient,
  route: string,
  organizationId: string | undefined,
  isAdminOrOwner: boolean,
  coachId: string | undefined
) => {
  if (!organizationId) return;

  const supabase = createClient();

  switch (route) {
    case '/dashboard':
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats', organizationId],
        queryFn: () => fetchDashboardStats(supabase, organizationId, isAdminOrOwner, coachId)
      });
      break;

    case '/schedule':
      queryClient.prefetchQuery({
        queryKey: ['schedules', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('schedules')
            .select('*, venue_classes(name), coaches(id, organization_members(profiles(name))), venues(name)')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('start_time', { ascending: true });
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/attendance':
      // Attendance data depends heavily on the currently selected date (defaulting to today).
      // Since prefetching doesn't have the date context easily accessible without duplicating logic,
      // we defer fetching to the AttendanceClient component to avoid cache pollution.
      break;

    case '/students':
      queryClient.prefetchQuery({
        queryKey: ['students', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('students')
            .select('*, organization_belts(name), venues(name), class_students(id, class_id, status, venue_classes(name, venues(name)))')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data?.map(student => ({
            ...student,
            class_students: student.class_students?.filter((cs: any) => cs.status === 'active') || []
          })) || [];
        }
      });
      break;
      
    case '/classes':
      queryClient.prefetchQuery({
        queryKey: ['classes', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venue_classes')
            .select('*, venues(name), class_coaches(*, coaches(id, organization_members(profiles(name)))), class_students(id, student_id, status)')
            .eq('organization_id', organizationId);
          if (error) throw error;
          return data || [];
        }
      });
      break;

    default:
      break;
  }
};
