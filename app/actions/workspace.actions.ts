'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { isFounderEmail } from '@/services/platform-admin.service';

export async function switchWorkspace(organizationId: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify the user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const isFounder = isFounderEmail(userData.user.email);

  if (isFounder) {
    // If founder, ensure active owner membership exists in target organization
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from('organization_members').insert({
        organization_id: organizationId,
        user_id: profile.id,
        role: 'owner',
        status: 'active',
        permissions: [
          'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
          'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
          'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
        ]
      });
    } else if (existingMember.status !== 'active') {
      await supabase.from('organization_members')
        .update({ status: 'active' })
        .eq('id', existingMember.id);
    }
  } else {
    // Regular user: verify membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('user_id', profile.id)
      .single();

    if (!membership || membership.status !== 'active') {
      return { success: false, error: 'You do not have an active membership in this organization' };
    }
  }

  // Update last_active_workspace
  await supabase.from('profiles').update({ last_active_workspace: organizationId }).eq('id', profile.id);

  // Set the cookie
  cookies().set('yoogi_workspace_id', organizationId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  // Clear server cache
  revalidatePath('/', 'layout');

  return { success: true };
}
