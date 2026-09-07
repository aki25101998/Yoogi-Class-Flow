'use server';

import { 
  inviteMember, 
  revokeInvitation, 
  removeMember,
  suspendMember,
  reactivateMember,
  changeRole
} from '@/services/members.service';
import { OrganizationRole } from '@/types/organization';

export async function inviteMemberAction(email: string, role: OrganizationRole) {
  return await inviteMember(email, role);
}

export async function revokeInvitationAction(id: string) {
  return await revokeInvitation(id);
}

export async function removeMemberAction(id: string) {
  return await removeMember(id);
}

export async function suspendMemberAction(id: string) {
  return await suspendMember(id);
}

export async function reactivateMemberAction(id: string) {
  return await reactivateMember(id);
}

export async function changeRoleAction(id: string, role: OrganizationRole) {
  return await changeRole(id, role);
}

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function importCoachesBatchAction(coaches: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('import_coaches_batch', {
    p_org_id: context.organization.id,
    p_coaches: coaches,
    p_summary: `Import Excel ${coaches.length} HLV`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success) {
    revalidatePath('/coaches');
    return { success: true, count: data.count };
  }

  return { success: false, error: data?.error || 'Unknown error during import' };
}

export async function updateCoachNicknameAction(coachId: string, nickname: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.membership) return { success: false, error: 'Access Denied' };
  
  if (context.membership.role !== 'owner' && context.membership.role !== 'admin') {
    return { success: false, error: 'Permission Denied' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('coaches')
    .update({ nickname })
    .eq('id', coachId)
    .eq('organization_id', context.organization.id);

  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/coaches');
  return { success: true };
}

import { updateCoachFullProfile } from '@/services/members.service';

export async function updateCoachFullProfileAction(
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
) {
  const res = await updateCoachFullProfile(coachId, data);
  if (res.success) {
    revalidatePath('/coaches');
  }
  return res;
}

export async function uploadAdminCoachAvatarAction(coachId: string, formData: FormData) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.membership) return { success: false, error: 'Access Denied' };
  
  if (context.membership.role !== 'owner' && context.membership.role !== 'admin') {
    return { success: false, error: 'Permission Denied' };
  }

  const avatarFile = formData.get('avatar');
  if (!(avatarFile instanceof File) || avatarFile.size === 0) {
    return { success: false, error: 'File ảnh không hợp lệ' };
  }

  if (avatarFile.size > 2 * 1024 * 1024) {
    return { success: false, error: 'Ảnh đại diện không được vượt quá 2MB.' };
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
    return { success: false, error: 'Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP).' };
  }

  const supabase = await createClient();
  const fileExt = avatarFile.type === 'image/jpeg' ? 'jpg' : avatarFile.type === 'image/png' ? 'png' : 'webp';
  const fileName = `${coachId}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, avatarFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: avatarFile.type,
    });

  if (uploadError) {
    console.error('Upload avatar error:', uploadError);
    return { success: false, error: 'Không thể tải ảnh đại diện lên.' };
  } 

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { success: true, avatarUrl: publicUrlData.publicUrl };
}
