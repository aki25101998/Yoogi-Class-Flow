import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { OrganizationContext } from '@/types/organization';

export async function fetchDashboardStats(supabase: any, orgId: string, isAdminOrOwner: boolean, coachId: string | undefined) {
  if (isAdminOrOwner) {
    const [coachesRes, classesRes, venuesRes, studentsRes] = await Promise.all([
      supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['active', 'suspended']),
      supabase.from('venue_classes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
      supabase.from('venues').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    ]);

    return {
      coachCount: coachesRes.count || 0,
      classCount: classesRes.count || 0,
      venueCount: venuesRes.count || 0,
      studentCount: studentsRes.count || 0,
      scheduleTodayCount: 0 // Mocked
    };
  } else {
    const { data: classCoaches } = await supabase.from('class_coaches')
      .select('class_id')
      .eq('organization_id', orgId)
      .eq('coach_id', coachId);
    
    return {
      coachCount: 0,
      classCount: classCoaches?.length || 0,
      venueCount: 0,
      studentCount: 0,
      scheduleTodayCount: 0
    };
  }
}

export function useDashboardStats(context: OrganizationContext | null) {
  const supabase = createClient();
  const orgId = context?.organization?.id;
  const isAdminOrOwner = context?.membership?.role === 'admin' || context?.membership?.role === 'owner';
  const coachId = context?.coach?.id;

  const {
    data: stats = {
      coachCount: 0,
      classCount: 0,
      venueCount: 0,
      studentCount: 0,
      scheduleTodayCount: 0
    },
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard-stats', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization id');
      return fetchDashboardStats(supabase, orgId, isAdminOrOwner, coachId);
    },
    enabled: !!orgId,
  });

  return {
    stats,
    isLoading,
    error,
    isAdminOrOwner,
  };
}
