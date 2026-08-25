import { createClient } from "@/utils/supabase/server";

export async function getCurrentCoach() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authData?.user) {
    return { user: null, coach: null, error: authError || new Error("Not authenticated") };
  }

  const user = authData.user;
  
  // 1. Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
    
  if (!profile) {
    // Fallback for legacy coaches before migration is fully complete
    const email = user.email?.toLowerCase().trim();
    const { data: legacyCoach } = await supabase
      .from('coaches')
      .select('*')
      .eq('email', email)
      .single();
      
    if (legacyCoach) {
      return { user, coach: legacyCoach, error: null };
    }
    return { user, coach: null, error: new Error("Profile not found") };
  }

  // 2. Get active organization memberships
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', profile.id)
    .eq('status', 'active');
    
  if (!memberships || memberships.length === 0) {
    return { user, coach: null, error: new Error("No active organization found") };
  }

  // Assume the first membership for now (can be expanded to support org switching)
  const currentMembership = memberships[0];

  // 3. Get coach profile associated with this membership (if any)
  const { data: coachProfile } = await supabase
    .from('coaches')
    .select('*')
    .eq('organization_member_id', currentMembership.id)
    .single();

  // 4. Construct compatibility coach object for frontend
  const coach = {
    id: coachProfile?.id || currentMembership.id, // Fallback to member id if not a coach
    auth_user_id: user.id,
    organization_id: currentMembership.organization_id,
    organization_member_id: currentMembership.id,
    name: profile.name,
    email: profile.email,
    phone: coachProfile?.phone || '',
    role: currentMembership.role,
    permissions: currentMembership.permissions,
    status: currentMembership.status,
    photo_url: profile.avatar_url || coachProfile?.photo_url || ''
  };

  return { user, coach, error: null };
}
