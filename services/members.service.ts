import { createClient } from '@/utils/supabase/server';
import { OrganizationRole } from '@/types/organization';
import { getCurrentOrganizationContext } from './organization.service';
import { getAppUrl } from '@/utils/app-url';

export async function inviteMember(email: string, role: OrganizationRole): Promise<{ success: boolean; error?: string; invitationCreated?: boolean; invitationUrl?: string; invitationId?: string; expiresAt?: string }> {
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
    return { success: false, error: 'Lời mời cho email này đã tồn tại và đang chờ xử lý.' };
  }

  let permissions: string[] = [];
  if (role === 'head_coach') {
    permissions = ['VIEW_CLASSES', 'VIEW_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_SALARY'];
  } else if (role === 'assistant_coach') {
    permissions = ['VIEW_ASSIGNED_CLASSES', 'VIEW_ASSIGNED_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_MY_EARNINGS'];
  } else if (role === 'admin') {
    permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members'];
  } else if (role === 'owner') {
    permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members', 'manage_organization'];
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const { data: newInvite, error } = await supabase.from('organization_invitations').insert([{
    organization_id: context.organization.id,
    email: email.toLowerCase(),
    role,
    permissions,
    invited_by: context.profile.id,
    status: 'pending',
    expires_at: expiresAt.toISOString()
  }]).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Generate invitation URL (link-first flow — no email sent)
  const appUrl = getAppUrl();
  const invitationUrl = `${appUrl}/invite/${newInvite.id}`;

  return {
    success: true,
    invitationCreated: true,
    invitationUrl,
    invitationId: newInvite.id,
    expiresAt: expiresAt.toISOString()
  };
}

export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string; emailSent?: boolean }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated or no organization context' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied: Only admin or owner can resend invitations' };
  }

  const supabase = await createClient();

  // Fetch pending invitation
  const { data: invite } = await supabase.from('organization_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('organization_id', context.organization.id)
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return { success: false, error: 'Không tìm thấy lời mời đang chờ.' };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'Lời mời đã hết hạn, không thể gửi lại.' };
  }

  const roleLabels: Record<string, string> = {
    owner: 'Chủ tổ chức',
    admin: 'Quản trị viên',
    head_coach: 'HLV trưởng',
    assistant_coach: 'HLV phụ'
  };
  const roleLabel = roleLabels[invite.role] || invite.role;
  
  const appUrl = getAppUrl();
  const invitationUrl = `${appUrl}/invite/${invite.id}`;

  const { sendInvitationEmail } = await import('./email.service');
  const emailResult = await sendInvitationEmail({
    to: invite.email,
    organizationName: context.organization.name || 'Tổ chức',
    roleLabel,
    invitationUrl
  });

  if (!emailResult.success) {
    return { success: false, error: 'Gửi lại email thất bại. Vui lòng thử lại sau.' };
  }

  return { success: true, emailSent: true };
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

  if (context.membership.id === memberId) {
    return { success: false, error: 'Không thể tự xóa bản thân khỏi tổ chức bằng cách này.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  await supabase.from('coaches').update({ status: 'inactive' }).eq('organization_member_id', memberId);

  return { success: true };
}

export async function suspendMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') return { success: false, error: 'Permission denied' };
  if (context.membership.id === memberId) return { success: false, error: 'Không thể tự đình chỉ bản thân.' };

  const supabase = await createClient();
  const { error } = await supabase.from('organization_members').update({ status: 'suspended' }).eq('id', memberId).eq('organization_id', context.organization.id);
  
  if (error) return { success: false, error: error.message };
  await supabase.from('coaches').update({ status: 'inactive' }).eq('organization_member_id', memberId);
  return { success: true };
}

export async function reactivateMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') return { success: false, error: 'Permission denied' };

  const supabase = await createClient();
  const { error } = await supabase.from('organization_members').update({ status: 'active' }).eq('id', memberId).eq('organization_id', context.organization.id);
  
  if (error) return { success: false, error: error.message };
  await supabase.from('coaches').update({ status: 'active' }).eq('organization_member_id', memberId);
  return { success: true };
}

export async function changeRole(memberId: string, newRole: OrganizationRole): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };
  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') return { success: false, error: 'Permission denied' };
  if (context.membership.id === memberId) return { success: false, error: 'Không thể tự hạ quyền bản thân.' };

  let permissions: string[] = [];
  if (newRole === 'head_coach') permissions = ['VIEW_CLASSES', 'VIEW_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_SALARY'];
  else if (newRole === 'assistant_coach') permissions = ['VIEW_ASSIGNED_CLASSES', 'VIEW_ASSIGNED_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_MY_EARNINGS'];
  else if (newRole === 'admin') permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members'];
  else if (newRole === 'owner') permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members', 'manage_organization'];

  const supabase = await createClient();
  const { error } = await supabase.from('organization_members').update({ role: newRole, permissions }).eq('id', memberId).eq('organization_id', context.organization.id);
  
  if (error) return { success: false, error: error.message };
  
  const coachRole = newRole === 'admin' || newRole === 'owner' ? 'admin' : 'coach';
  await supabase.from('coaches').update({ role: coachRole, permissions }).eq('organization_member_id', memberId);
  
  return { success: true };
}
