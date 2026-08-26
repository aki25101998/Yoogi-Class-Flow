'use server';

import { acceptInvitationById } from '@/services/invitations.service';

export async function acceptInvitationAction(invitationId: string) {
  return await acceptInvitationById(invitationId);
}
