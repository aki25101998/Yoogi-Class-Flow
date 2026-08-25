'use server';

import { acceptInvitation } from '@/services/invitations.service';

export async function acceptInvitationAction() {
  return await acceptInvitation();
}
