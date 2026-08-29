'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function switchWorkspace(organizationId: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify the user is actually a member of this organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('user_id', profile.id)
    .single();

  if (!membership || membership.status !== 'active') {
    return { success: false, error: 'You do not have an active membership in this organization' };
  }

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
