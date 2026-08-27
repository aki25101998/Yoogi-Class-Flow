import { createClient } from '@/utils/supabase/server';

export async function acceptInvitation(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const email = userData.user.email?.toLowerCase().trim();
  if (!email) return { success: false, error: 'User email not found' };

  // Fetch pending invitations for this email
  const { data: invitations, error: invError } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending');

  if (invError || !invitations || invitations.length === 0) {
    return { success: false, error: 'Không có lời mời nào.' };
  }

  const invitation = invitations[0];
  
  // Call the secure RPC for the first found invitation
  const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_invitation', {
    invitation_id: invitation.id
  });

  if (rpcError) {
    console.error('RPC Error accepting invitation:', rpcError, {
      userId: userData.user.id,
      email,
      invitationId: invitation.id
    });
    return { success: false, error: `Lỗi hệ thống: ${rpcError.message}` };
  }

  if (rpcResult && typeof rpcResult === 'object') {
    if (rpcResult.success === false) {
      return { success: false, error: rpcResult.error || 'Lỗi hệ thống.' };
    }
    return { success: true };
  }

  return { success: false, error: 'Phản hồi từ máy chủ không hợp lệ.' };
}

export async function acceptInvitationById(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, error: 'Not authenticated' };

  const email = userData.user.email?.toLowerCase().trim();
  if (!email) return { success: false, error: 'User email not found' };

  // Instead of querying and inserting manually (which breaks under RLS unless we use adminClient and isn't atomic),
  // we call the secure RPC which runs as SECURITY DEFINER.
  // We use the authenticated client to ensure the request is properly tied to the logged-in user.
  const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_invitation', {
    invitation_id: invitationId
  });

  if (rpcError) {
    console.error('RPC Error accepting invitation:', rpcError, {
      userId: userData.user.id,
      email,
      invitationId
    });
    return { success: false, error: `Lỗi hệ thống: ${rpcError.message}` };
  }

  // The RPC returns a JSON object { success: boolean, error?: string }
  if (rpcResult && typeof rpcResult === 'object') {
    if (rpcResult.success === false) {
      return { success: false, error: rpcResult.error || 'Lỗi hệ thống.' };
    }
    return { success: true };
  }

  return { success: false, error: 'Phản hồi từ máy chủ không hợp lệ.' };
}
