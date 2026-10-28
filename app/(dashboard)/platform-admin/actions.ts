'use server';

import { 
  getPlatformOrganizations, 
  provisionOrganization, 
  updateOrganizationStatus,
  verifyFounderAccess 
} from '@/services/platform-admin.service';
import { switchWorkspace } from '@/app/actions/workspace.actions';
import { revalidatePath } from 'next/cache';

export async function getPlatformOverviewAction() {
  return await getPlatformOrganizations();
}

export async function provisionOrganizationAction(formData: {
  name: string;
  ownerEmail: string;
  ownerName?: string;
  plan: string;
  durationMonths: number;
  createCoachProfile?: boolean;
}) {
  const result = await provisionOrganization(formData);
  if (result.success) {
    revalidatePath('/platform-admin');
  }
  return result;
}

export async function updateOrganizationStatusAction(
  orgId: string,
  status: 'active' | 'expired' | 'suspended',
  addMonths?: number,
  plan?: string
) {
  const result = await updateOrganizationStatus(orgId, status, addMonths, plan);
  if (result.success) {
    revalidatePath('/platform-admin');
  }
  return result;
}

export async function switchIntoWorkspaceAction(organizationId: string) {
  const auth = await verifyFounderAccess();
  if (!auth.isAuthorized) {
    return { success: false, error: auth.error };
  }

  return await switchWorkspace(organizationId);
}
