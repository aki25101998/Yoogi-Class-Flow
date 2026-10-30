'use server';

import { inviteMember, revokeInvitation, removeMember, changeRole } from '@/services/members.service';
import { OrganizationRole } from '@/types/organization';

export async function inviteMemberAction(
  email: string, 
  role: OrganizationRole,
  customRoleTitle?: string,
  customPermissions?: string[]
) {
  return await inviteMember(email, role, customRoleTitle, customPermissions);
}

export async function revokeInvitationAction(id: string) {
  return await revokeInvitation(id);
}

export async function removeMemberAction(id: string) {
  return await removeMember(id);
}

export async function changeRoleAction(
  id: string, 
  newRole: OrganizationRole,
  customRoleTitle?: string,
  customPermissions?: string[]
) {
  return await changeRole(id, newRole, customRoleTitle, customPermissions);
}
