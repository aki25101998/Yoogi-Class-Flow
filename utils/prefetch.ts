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
          const { data } = await supabase
            .from('schedules')
            .select('*, venue_classes(name), coaches(name), venues(name)')
            .eq('organization_id', organizationId)
            .order('start_time', { ascending: true });
          return data || [];
        }
      });
      break;

    case '/attendance':
      queryClient.prefetchQuery({
        queryKey: ['attendanceClasses', organizationId],
        queryFn: async () => {
          const { data } = await supabase
            .from('venue_classes')
            .select('*, class_students(student_id, students(name))')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          return data || [];
        }
      });
      break;

    case '/students':
      queryClient.prefetchQuery({
        queryKey: ['students', organizationId],
        queryFn: async () => {
          const { data } = await supabase
            .from('students')
            .select('*, class_students(venue_classes(name))')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          return data || [];
        }
      });
      break;
      
    case '/classes':
      queryClient.prefetchQuery({
        queryKey: ['classes', organizationId],
        queryFn: async () => {
          const { data } = await supabase
            .from('venue_classes')
            .select('*, venues(name), class_coaches(coaches(name))')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          return data || [];
        }
      });
      break;

    default:
      break;
  }
};
