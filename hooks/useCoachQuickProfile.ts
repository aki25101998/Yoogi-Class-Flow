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
          photo_url,
          organization_member_id,
          organization_members!inner (
            id,
            organization_id,
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
        
      if (coachError) {
        console.error('[CoachQuickProfile] Coach query error', {
          coachId,
          organizationId,
          error: coachError
        });
        throw coachError;
      }
      
      // Fetch assigned classes
      const { data: classCoachesData, error: classCoachesError } = await supabase
        .from('class_coaches')
        .select('class_id, role')
        .eq('coach_id', coachId)
        .eq('organization_id', organizationId);
        
      if (classCoachesError) {
        console.error('[CoachQuickProfile] Classes query error', {
          coachId,
          organizationId,
          error: classCoachesError
        });
        throw classCoachesError;
      }

      let formattedClasses: any[] = [];

      if (classCoachesData && classCoachesData.length > 0) {
        const classIds = classCoachesData.map((cc: any) => cc.class_id);

        const { data: classesData, error: classesError } = await supabase
          .from('venue_classes')
          .select(`
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
          `)
          .eq('organization_id', organizationId)
          .in('id', classIds);

        if (classesError) {
           console.error('[CoachQuickProfile] Classes details query error', {
             classIds,
             organizationId,
             error: classesError
           });
           throw classesError;
        }

        formattedClasses = classCoachesData.map((cc: any) => {
          const cls = (classesData || []).find((c: any) => c.id === cc.class_id);
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
      }
      
      const member: any = Array.isArray(coachData.organization_members) 
        ? coachData.organization_members[0] 
        : coachData.organization_members;
        
      const profile: any = member?.profiles 
        ? (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles) 
        : null;
        
      const role = member?.role;
      const joinedAt = coachData.created_at;

      const photoUrl = coachData.photo_url || profile?.avatar_url || null;

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
          avatarUrl: photoUrl,
          joinedAt: joinedAt
        },
        classes: formattedClasses
      };
    },
    enabled: !!organizationId && !!coachId,
  });
}

