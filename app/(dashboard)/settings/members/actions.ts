'use server';

import { inviteMember, revokeInvitation, removeMember, changeRole } from '@/services/members.service';
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

export async function changeRoleAction(id: string, newRole: OrganizationRole) {
  return await changeRole(id, newRole);
}
