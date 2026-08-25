import { createClient } from '@/utils/supabase/server';

export async function acceptInvitation(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const email = userData.user.email?.toLowerCase().trim();
  if (!email) return { success: false, error: 'User email not found' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (!profile) return { success: false, error: 'Profile not found' };

  // Fetch pending invitations for this email
  const { data: invitations, error: invError } = await supabase
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
    await supabase.from('organization_invitations').update({ status: 'expired' }).eq('id', invitation.id);
    return { success: false, error: 'Lời mời đã hết hạn.' };
  }

  // Check if they are already a member
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', profile.id)
    .eq('status', 'active');

  if (existingMembership && existingMembership.length > 0) {
    // Already a member, just mark invitation as accepted
    await supabase.from('organization_invitations').update({ 
      status: 'accepted', 
      accepted_at: new Date().toISOString() 
    }).eq('id', invitation.id);
    return { success: true };
  }

  // Create membership
  const { error: memberError } = await supabase
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
    const { data: existingCoach } = await supabase.from('coaches').select('*').eq('email', email).single();
    
    // Get the new membership to link it
    const { data: newMembership } = await supabase.from('organization_members')
      .select('id').eq('organization_id', invitation.organization_id).eq('user_id', profile.id).single();

    if (existingCoach && newMembership) {
      await supabase.from('coaches').update({ 
        organization_id: invitation.organization_id,
        organization_member_id: newMembership.id
      }).eq('id', existingCoach.id);
    } else if (newMembership) {
      // Create new coach record
      await supabase.from('coaches').insert([{
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
  await supabase.from('organization_invitations').update({ 
    status: 'accepted', 
    accepted_at: new Date().toISOString() 
  }).eq('id', invitation.id);

  return { success: true };
}
