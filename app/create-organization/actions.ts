'use server';

import { createOrganization } from '@/services/organization.service';

export async function createOrganizationAction(name: string, slug: string) {
  return await createOrganization(name, slug);
}
