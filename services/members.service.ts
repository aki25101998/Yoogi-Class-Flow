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
  if (context.membership.id === memberId) return { success: false, error: 'Không thể tự thay đổi vai trò của bản thân.' };

  const supabase = await createClient();
  
  // Fetch target member to check their current role
  const { data: targetMember, error: fetchError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('id', memberId)
    .eq('organization_id', context.organization.id)
    .single();

  if (fetchError || !targetMember) {
    return { success: false, error: 'Không tìm thấy thành viên.' };
  }

  // Prevent Admin from changing Owner's role
  if (targetMember.role === 'owner' && context.membership.role !== 'owner') {
    return { success: false, error: 'Quản trị viên không thể thay đổi vai trò của Chủ trung tâm.' };
  }

  let permissions: string[] = [];
  if (newRole === 'head_coach') permissions = ['VIEW_CLASSES', 'VIEW_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_SALARY'];
  else if (newRole === 'assistant_coach') permissions = ['VIEW_ASSIGNED_CLASSES', 'VIEW_ASSIGNED_STUDENTS', 'TAKE_ATTENDANCE', 'VIEW_ATTENDANCE', 'VIEW_SCHEDULE', 'VIEW_MY_EARNINGS'];
  else if (newRole === 'admin') permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members'];
  else if (newRole === 'owner') permissions = ['manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 'manage_members', 'manage_organization'];

  const { error } = await supabase.from('organization_members').update({ role: newRole, permissions }).eq('id', memberId).eq('organization_id', context.organization.id);
  
  if (error) return { success: false, error: error.message };
  
  const coachRole = newRole === 'admin' || newRole === 'owner' ? 'admin' : 'coach';
  await supabase.from('coaches').update({ role: coachRole, permissions }).eq('organization_member_id', memberId);
  
  return { success: true };
}

export async function updateCoachFullProfile(
  coachId: string,
  data: {
    name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    cccd?: string;
    role?: OrganizationRole;
    status?: string;
    photo_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();

  // 1. Fetch coach to get organization_member_id and user_id (via organization_members)
  const { data: coach, error: fetchCoachError } = await supabase
    .from('coaches')
    .select(`
      id, 
      organization_member_id,
      organization_members (
        id,
        user_id,
        role
      )
    `)
    .eq('id', coachId)
    .eq('organization_id', context.organization.id)
    .single();

  if (fetchCoachError || !coach) {
    return { success: false, error: 'Không tìm thấy HLV.' };
  }

  const memberId = coach.organization_member_id;
  // @ts-ignore
  const userId = coach.organization_members?.user_id;
  // @ts-ignore
  const currentRole = coach.organization_members?.role;

  // 2. Update coaches table
  const coachUpdate: any = {};
  if (data.nickname !== undefined) coachUpdate.nickname = data.nickname;
  if (data.phone !== undefined) coachUpdate.phone = data.phone;
  if (data.cccd !== undefined) coachUpdate.cccd = data.cccd;
  if (data.status !== undefined) coachUpdate.status = data.status;
  if (data.photo_url !== undefined) coachUpdate.photo_url = data.photo_url;
  
  // If role is updated, sync coaches.role as well
  if (data.role) {
    coachUpdate.role = data.role === 'admin' || data.role === 'owner' ? 'admin' : 'coach';
  }

  if (Object.keys(coachUpdate).length > 0) {
    const { error: updateCoachError } = await supabase
      .from('coaches')
      .update(coachUpdate)
      .eq('id', coachId);
    if (updateCoachError) return { success: false, error: updateCoachError.message };
  }

  // 3. Update organization_members table
  const memberUpdate: any = {};
  if (data.status !== undefined) memberUpdate.status = data.status;
  
  if (Object.keys(memberUpdate).length > 0 && memberId) {
    const { error: updateMemberError } = await supabase
      .from('organization_members')
      .update(memberUpdate)
      .eq('id', memberId);
    if (updateMemberError) return { success: false, error: updateMemberError.message };
  }

  // Handle role change specifically if provided and different
  if (data.role && data.role !== currentRole && memberId) {
    const roleRes = await changeRole(memberId, data.role);
    if (!roleRes.success) return { success: false, error: roleRes.error };
  }

  // 4. Update profiles table for name and email
  if ((data.name !== undefined || data.email !== undefined) && userId) {
    try {
      // Import admin client to bypass RLS for updating another user's profile
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const adminClient = createAdminClient();
      
      const profileUpdate: any = {};
      if (data.name !== undefined) profileUpdate.name = data.name;
      // Note: Updating email in profiles doesn't automatically update auth.users email unless handled by triggers.
      // Usually, it's better to update auth.users via adminClient.auth.admin.updateUserById
      if (data.email !== undefined) {
        profileUpdate.email = data.email;
        // Also update auth.users if needed
        const authRes = await adminClient.auth.admin.updateUserById(userId, { email: data.email });
        if (authRes.error) {
          console.error('Failed to update auth user email', authRes.error);
          return { success: false, error: 'Lỗi khi cập nhật email đăng nhập: ' + authRes.error.message };
        }
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: updateProfileError } = await adminClient
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId);
          
        if (updateProfileError) return { success: false, error: updateProfileError.message };
      }
    } catch (e: any) {
      console.error('Failed to update profile name/email', e);
      return { success: false, error: 'Không thể cập nhật thông tin cá nhân (Lỗi quyền).' };
    }
  }

  return { success: true };
}
