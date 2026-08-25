import { createClient } from '@/utils/supabase/server';
import { OrganizationRole } from '@/types/organization';
import { getCurrentOrganizationContext } from './organization.service';

export async function inviteMember(email: string, role: OrganizationRole, permissions: string[] = []): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated or no organization context' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied: Only admin or owner can invite members' };
  }

  const supabase = await createClient();

  // Check if already a member
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).single();
  if (existingProfile) {
    const { data: existingMember } = await supabase.from('organization_members')
      .select('id')
      .eq('organization_id', context.organization.id)
      .eq('user_id', existingProfile.id)
      .eq('status', 'active')
      .single();
    if (existingMember) {
      return { success: false, error: 'Người dùng này đã là thành viên của tổ chức.' };
    }
  }

  // Check if invitation already exists and pending
  const { data: existingInvite } = await supabase.from('organization_invitations')
    .select('id')
    .eq('organization_id', context.organization.id)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    return { success: false, error: 'Lời mời cho email này đã được gửi và đang chờ xử lý.' };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const { error } = await supabase.from('organization_invitations').insert([{
    organization_id: context.organization.id,
    email: email.toLowerCase(),
    role,
    permissions,
    invited_by: context.profile.id,
    status: 'pending',
    expires_at: expiresAt.toISOString()
  }]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  // Basic check: don't allow removing oneself if they are the only owner. (Complex check skipped for brevity, but we prevent removing oneself at least)
  if (context.membership.id === memberId) {
    return { success: false, error: 'Không thể tự xóa bản thân khỏi tổ chức bằng cách này.' };
  }

  const supabase = await createClient();

  // We could just change status to 'removed' instead of deleting, depending on business logic. Let's delete for now or update status.
  const { error } = await supabase.from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  // also suspend coach record
  await supabase.from('coaches').update({ status: 'inactive' }).eq('organization_member_id', memberId);

  return { success: true };
}
