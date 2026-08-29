'use server';

import { createOrganization } from '@/services/organization.service';

export async function createOrganizationAction(name: string) {
  return await createOrganization(name);
}
