import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useCoachQuickProfile(organizationId: string | undefined, coachId: string | null) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['coach_quick_profile', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId || !coachId) return null;
      
      // Fetch coach details
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select(`
          id,
          phone,
          cccd,
          status,
          created_at,
          nickname,
          organization_members!inner (
            role,
            status,
            profiles (
              name,
              email,
              avatar_url,
              phone
            )
          )
        `)
        .eq('id', coachId)
        .eq('organization_id', organizationId)
        .single();
        
      if (coachError) throw coachError;
      
      // Fetch assigned classes
      const { data: classesData, error: classesError } = await supabase
        .from('class_coaches')
        .select(`
          role,
          venue_classes!inner (
            id,
            name,
            status,
            schedule_days,
            venues (
              id,
              name
            ),
            class_students (
              status
            )
          )
        `)
        .eq('coach_id', coachId)
        .eq('organization_id', organizationId);
        
      if (classesError) throw classesError;
      
      const member: any = Array.isArray(coachData.organization_members) 
        ? coachData.organization_members[0] 
        : coachData.organization_members;
        
      const profile: any = member?.profiles 
        ? (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles) 
        : null;
        
      const role = member?.role;
      const joinedAt = coachData.created_at;

      const formattedClasses = (classesData || []).map((cc: any) => {
        const cls: any = Array.isArray(cc.venue_classes) ? cc.venue_classes[0] : cc.venue_classes;
        const venue: any = cls?.venues ? (Array.isArray(cls.venues) ? cls.venues[0] : cls.venues) : null;
        
        const activeStudents = (cls?.class_students || []).filter((cs: any) => cs.status === 'active').length;
        
        return {
          id: cls?.id,
          name: cls?.name,
          venueName: venue?.name || 'Chưa rõ',
          scheduleDays: cls?.schedule_days || [],
          role: cc.role,
          studentCount: activeStudents,
          status: cls?.status
        };
      });

      return {
        coach: {
          id: coachData.id,
          name: coachData.nickname ? `${profile?.name} (${coachData.nickname})` : profile?.name || '-',
          originalName: profile?.name || '-',
          email: profile?.email || '-',
          phone: coachData.phone || profile?.phone || '-',
          cccd: coachData.cccd || '-',
          role: role,
          status: coachData.status,
          avatarUrl: profile?.avatar_url,
          joinedAt: joinedAt
        },
        classes: formattedClasses
      };
    },
    enabled: !!organizationId && !!coachId,
  });
}
