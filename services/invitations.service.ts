import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function acceptInvitation(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const email = userData.user.email?.toLowerCase().trim();
  if (!email) return { success: false, error: 'User email not found' };

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  // Fetch pending invitations for this email
  const { data: invitations, error: invError } = await adminClient
    .from('organization_invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending');

  if (invError || !invitations || invitations.length === 0) {
    return { success: false, error: 'Không tìm thấy lời mời nào hợp lệ.' };
  }

  // We'll just accept the first pending one for now
  const invitation = invitations[0];

  // Check if it's expired
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await adminClient.from('organization_invitations').update({ status: 'expired' }).eq('id', invitation.id);
    return { success: false, error: 'Lời mời đã hết hạn.' };
  }

  // Check if they are already a member
  const { data: existingMembership } = await adminClient
    .from('organization_members')
    .select('*')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', profile.id)
    .eq('status', 'active');

  if (existingMembership && existingMembership.length > 0) {
    // Already a member, just mark invitation as accepted
    await adminClient.from('organization_invitations').update({ 
      status: 'accepted', 
      accepted_at: new Date().toISOString() 
    }).eq('id', invitation.id);
    return { success: true };
  }

  // Create membership
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert([{
      organization_id: invitation.organization_id,
      user_id: profile.id,
      role: invitation.role,
      status: 'active',
      permissions: invitation.permissions
    }]);

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // Also create coach record if they are a coach
  if (invitation.role === 'head_coach' || invitation.role === 'assistant_coach' || invitation.role === 'admin' || invitation.role === 'owner') {
    // Check if coach record already exists (maybe from legacy)
    const { data: existingCoach } = await adminClient.from('coaches').select('*').eq('email', email).single();
    
    // Get the new membership to link it
    const { data: newMembership } = await adminClient.from('organization_members')
      .select('id').eq('organization_id', invitation.organization_id).eq('user_id', profile.id).single();

    if (existingCoach && newMembership) {
      await adminClient.from('coaches').update({ 
        organization_id: invitation.organization_id,
        organization_member_id: newMembership.id
      }).eq('id', existingCoach.id);
    } else if (newMembership) {
      // Create new coach record
      await adminClient.from('coaches').insert([{
        organization_id: invitation.organization_id,
        organization_member_id: newMembership.id,
        email: email,
        name: profile.name,
        role: invitation.role === 'admin' || invitation.role === 'owner' ? 'admin' : 'coach',
        status: 'active',
        permissions: invitation.permissions
      }]);
    }
  }

  // Mark invitation as accepted
  await adminClient.from('organization_invitations').update({ 
    status: 'accepted', 
    accepted_at: new Date().toISOString() 
  }).eq('id', invitation.id);

  return { success: true };
}

export async function acceptInvitationById(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const email = userData.user.email?.toLowerCase().trim();
  if (!email) return { success: false, error: 'User email not found' };

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  // Fetch the specific invitation by ID
  const { data: invitation, error: invError } = await adminClient
    .from('organization_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invError || !invitation) {
    return { success: false, error: 'Không tìm thấy lời mời.' };
  }

  // Validate the invitation
  if (invitation.status === 'revoked') {
    return { success: false, error: 'Lời mời đã bị thu hồi.' };
  }
  if (invitation.status === 'expired') {
    return { success: false, error: 'Lời mời đã hết hạn.' };
  }
  if (invitation.status === 'accepted') {
    return { success: false, error: 'Lời mời này đã được sử dụng.' };
  }
  if (invitation.status !== 'pending') {
    return { success: false, error: 'Lời mời không hợp lệ.' };
  }

  // Check email match
  if (invitation.email.toLowerCase() !== email) {
    return { success: false, error: `Lời mời này được gửi tới ${invitation.email}. Vui lòng đăng nhập bằng đúng tài khoản được mời.` };
  }

  // Check expiry again just in case the CRON didn't run or status wasn't updated
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await adminClient.from('organization_invitations').update({ status: 'expired' }).eq('id', invitation.id);
    return { success: false, error: 'Lời mời đã hết hạn.' };
  }

  // Check if they are already an active member
  const { data: existingMembership } = await adminClient
    .from('organization_members')
    .select('*')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', profile.id)
    .eq('status', 'active');

  if (existingMembership && existingMembership.length > 0) {
    await adminClient.from('organization_invitations').update({ 
      status: 'accepted', 
      accepted_at: new Date().toISOString() 
    }).eq('id', invitation.id);
    return { success: true };
  }

  // Create membership
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert([{
      organization_id: invitation.organization_id,
      user_id: profile.id,
      role: invitation.role,
      status: 'active',
      permissions: invitation.permissions
    }]);

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  // Also create coach record if they are a coach
  if (invitation.role === 'head_coach' || invitation.role === 'assistant_coach' || invitation.role === 'admin' || invitation.role === 'owner') {
    const { data: existingCoach } = await adminClient.from('coaches').select('*').eq('email', email).single();
    const { data: newMembership } = await adminClient.from('organization_members')
      .select('id').eq('organization_id', invitation.organization_id).eq('user_id', profile.id).single();

    if (existingCoach && newMembership) {
      await adminClient.from('coaches').update({ 
        organization_id: invitation.organization_id,
        organization_member_id: newMembership.id
      }).eq('id', existingCoach.id);
    } else if (newMembership) {
      await adminClient.from('coaches').insert([{
        organization_id: invitation.organization_id,
        organization_member_id: newMembership.id,
        email: email,
        name: profile.name,
        role: invitation.role === 'admin' || invitation.role === 'owner' ? 'admin' : 'coach',
        status: 'active',
        permissions: invitation.permissions
      }]);
    }
  }

  // Mark invitation as accepted
  await adminClient.from('organization_invitations').update({ 
    status: 'accepted', 
    accepted_at: new Date().toISOString() 
  }).eq('id', invitation.id);

  return { success: true };
}
