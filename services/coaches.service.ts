import { createClient } from "@/utils/supabase/server";
import { Coach } from "@/types/coach";

export const CoachesService = {
  async getCoachByAuthId(authUserId: string): Promise<Coach | null> {
    const supabase = await createClient();
    
    // First, find profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .eq('auth_user_id', authUserId)
      .single();
      
    if (!profile) return null;
    
    // Find active membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('id, organization_id, role, status, permissions')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .limit(1)
      .single();
      
    if (!member) return null;
    
    // Find coach
    const { data: coachData } = await supabase
      .from('coaches')
      .select('*')
      .eq('organization_member_id', member.id)
      .limit(1)
      .single();
    
    if (!coachData) return null;

    return {
      id: coachData.id,
      organization_id: coachData.organization_id,
      organization_member_id: coachData.organization_member_id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      phone: coachData.phone || '',
      cccd: coachData.cccd || '',
      level: coachData.level || '',
      membership_number: coachData.membership_number || '',
      role: coachData.role || member.role,
      permissions: coachData.permissions || member.permissions || [],
      status: coachData.status || member.status,
    } as Coach;
  },
  
  async getActiveCoaches(): Promise<Coach[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('coaches')
      .select(`
        id, 
        organization_id, 
        organization_member_id, 
        phone, 
        cccd, 
        level, 
        membership_number, 
        role, 
        status, 
        permissions,
        organization_members (
          role,
          status,
          permissions,
          profiles (
            name,
            email,
            avatar_url
          )
        )
      `)
      .eq('status', 'active');
      
    if (!data) return [];

    return data.map((coach: any) => {
      const member = coach.organization_members;
      const profile = member?.profiles;
      return {
        id: coach.id,
        organization_id: coach.organization_id,
        organization_member_id: coach.organization_member_id,
        name: profile?.name || '',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || '',
        phone: coach.phone || '',
        cccd: coach.cccd || '',
        level: coach.level || '',
        membership_number: coach.membership_number || '',
        role: coach.role || member?.role,
        permissions: coach.permissions || member?.permissions || [],
        status: coach.status || member?.status,
      } as Coach;
    });
  }
};
