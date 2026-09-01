import { createClient } from "@/utils/supabase/server";
import { Coach } from "@/types/coach";
import { getCurrentOrganizationContext } from "@/services/organization.service";

export async function getCurrentCoach() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authData?.user) {
    return { user: null, coach: null, context: null, error: authError || new Error("Not authenticated") };
  }

  const user = authData.user;
  
  const context = await getCurrentOrganizationContext(user.id);

  if (!context) {
    return { user, coach: null, context: null, error: new Error("No active organization found") };
  }

  const { membership, profile, coach: coachProfile, permissions } = context;

  if (!membership || !profile) {
    return { user, coach: null, context: null, error: new Error("Invalid organization context") };
  }

  // Construct compatibility coach object for frontend
  const coach: Coach = {
    id: coachProfile?.id || membership.id,
    organization_id: membership.organization_id,
    organization_member_id: membership.id,
    name: profile.name,
    email: profile.email,
    phone: coachProfile?.phone || '',
    cccd: coachProfile?.cccd || '',
    level: coachProfile?.level || '',
    membership_number: coachProfile?.membership_number || '',
    role: membership.role,
    permissions: permissions || [],
    status: coachProfile?.status || membership.status,
    avatar_url: profile.avatar_url || ''
  };

  return { user, coach, context, error: null };
}
