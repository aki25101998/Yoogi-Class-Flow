import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useCoaches(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: members = [],
    isLoading: isMembersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ['coaches', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*, profiles(email, name), coaches(id, status)')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'suspended']);
        
      if (membersError) throw membersError;
      
      const coachIds = (membersData || [])
        .map((m: any) => m.coaches?.[0]?.id)
        .filter(Boolean);

      let classCountsByCoach: Record<string, number> = {};
      if (coachIds.length > 0) {
        const { data: classCoachesData } = await supabase
          .from('class_coaches')
          .select('coach_id')
          .in('coach_id', coachIds);
          
        if (classCoachesData) {
          classCountsByCoach = classCoachesData.reduce((acc: Record<string, number>, row: any) => {
            acc[row.coach_id] = (acc[row.coach_id] || 0) + 1;
            return acc;
          }, {});
        }
      }
      
      const memberWithClassCount = (membersData || []).map((m: any) => {
        let classCount = 0;
        if (m.coaches && m.coaches.length > 0) {
           classCount = classCountsByCoach[m.coaches[0].id] || 0;
        }
        
        // Unified data structure for the UI
        return {
          ...m,
          name: m.profiles?.name || m.profiles?.email || '-',
          email: m.profiles?.email || '-',
          classCount
        };
      });
      
      return memberWithClassCount;
    },
    enabled: !!organizationId,
  });

  const {
    data: invitations = [],
    isLoading: isInvitationsLoading,
  } = useQuery({
    queryKey: ['invitations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending']);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    members,
    invitations,
    isLoading: isMembersLoading,
    error: membersError,
  };
}
