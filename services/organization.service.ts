import { createClient } from '@/utils/supabase/server';
import { OrganizationContext } from '@/types/organization';

export async function getCurrentOrganizationContext(): Promise<OrganizationContext | null> {
  const supabase = await createClient();
  
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }

  // Get Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return null;

  // Get active membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single();

  if (!membership) return null;

  // Get coach profile if exists
  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('organization_member_id', membership.id)
    .single();

  return {
    organization: membership.organization,
    membership: membership,
    profile: profile,
    coach: coach || null,
    permissions: membership.permissions || []
  };
}

export async function createOrganization(name: string, slug: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  // Check if they already have an active membership
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', profile.id)
    .eq('status', 'active');

  if (existingMembership && existingMembership.length > 0) {
    return { success: false, error: 'You are already part of an organization' };
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert([{ name, slug, owner_id: profile.id }])
    .select()
    .single();

  if (orgError) {
    return { success: false, error: orgError.message };
  }

  // Create owner membership with full permissions
  const permissions = [
    'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
    'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members', 'manage_organization'
  ];

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert([{
      organization_id: org.id,
      user_id: profile.id,
      role: 'owner',
      status: 'active',
      permissions
    }]);

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  return { success: true };
}
