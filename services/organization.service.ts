import { createClient } from '@/utils/supabase/server';
import { OrganizationContext } from '@/types/organization';

import { cookies } from 'next/headers';

export async function getCurrentOrganizationContext(): Promise<OrganizationContext | null> {
  const supabase = await createClient();
  const cookieStore = cookies();
  const workspaceId = cookieStore.get('yoogi_workspace_id')?.value;
  
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

  // Get all active memberships
  const { data: allMemberships } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active');

  if (!allMemberships || allMemberships.length === 0) return null;

  // Find the active membership based on cookie, or default to the last_active_workspace
  let activeMembership = allMemberships.find(m => m.organization_id === workspaceId);
  
  if (!activeMembership && profile.last_active_workspace) {
    activeMembership = allMemberships.find(m => m.organization_id === profile.last_active_workspace);
  }

  if (!activeMembership) {
    // Deterministic fallback: earliest joined organization
    activeMembership = [...allMemberships].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    
    // Update last_active_workspace so it persists
    if (activeMembership) {
      await supabase.from('profiles').update({ last_active_workspace: activeMembership.organization_id }).eq('id', profile.id);
    }
  }

  // Get coach profile if exists
  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('organization_member_id', activeMembership.id)
    .single();

  return {
    organization: activeMembership.organization,
    membership: activeMembership,
    profile: profile,
    coach: coach || null,
    permissions: activeMembership.permissions || [],
    allMemberships: allMemberships
  };
}

export async function createOrganization(name: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert([{ name, owner_id: profile.id }])
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

  // Update last_active_workspace and set cookie for immediate switch
  await supabase.from('profiles').update({ last_active_workspace: org.id }).eq('id', profile.id);
  cookies().set('yoogi_workspace_id', org.id, { path: '/' });

  return { success: true };
}
