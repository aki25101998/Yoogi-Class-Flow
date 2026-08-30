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
