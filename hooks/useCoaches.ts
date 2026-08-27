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
      
      const memberWithClassCount = await Promise.all((membersData || []).map(async (m: any) => {
        let classCount = 0;
        if (m.coaches && m.coaches.length > 0) {
           const coachId = m.coaches[0].id;
           const { count } = await supabase.from('class_coaches')
             .select('*', { count: 'exact', head: true })
             .eq('coach_id', coachId);
           classCount = count || 0;
        }
        
        // Unified data structure for the UI
        return {
          ...m,
          name: m.profiles?.name || m.profiles?.email || '-',
          email: m.profiles?.email || '-',
          classCount
        };
      }));
      
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
    isLoading: isMembersLoading || isInvitationsLoading,
    error: membersError,
  };
}
