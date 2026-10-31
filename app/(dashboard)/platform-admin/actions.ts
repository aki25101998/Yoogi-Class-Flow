'use server';

import { 
  getPlatformOrganizations, 
  provisionOrganization, 
  updateOrganizationStatus,
  transferOrganizationOwnership,
  verifyFounderAccess,
  FOUNDER_EMAIL
} from '@/services/platform-admin.service';
import { switchWorkspace } from '@/app/actions/workspace.actions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

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

export async function updateOrganizationStatusAction(params: {
  orgId: string;
  status?: 'active' | 'expired' | 'suspended';
  addMonths?: number;
  plan?: string;
  exactExpiresAt?: string | null;
  name?: string;
}) {
  const result = await updateOrganizationStatus(
    params.orgId, 
    params.status, 
    params.addMonths, 
    params.plan, 
    params.exactExpiresAt, 
    params.name
  );
  if (result.success) {
    revalidatePath('/platform-admin');
    revalidatePath('/', 'layout');
  }
  return result;
}

export async function switchIntoWorkspaceAction(organizationId: string) {
  const auth = await verifyFounderAccess();
  if (!auth.isAuthorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // Find Founder Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', FOUNDER_EMAIL)
    .maybeSingle();

  if (profile) {
    // Check if founder already has membership in target workspace
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!existingMember) {
      // Add founder as owner so context resolution and RLS succeed
      await supabase.from('organization_members').insert({
        organization_id: organizationId,
        user_id: profile.id,
        role: 'owner',
        status: 'active',
        permissions: [
          'manage_coaches', 'manage_students', 'manage_venues', 
          'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
          'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
        ]
      });
    } else if (existingMember.status !== 'active') {
      await supabase.from('organization_members')
        .update({ status: 'active' })
        .eq('id', existingMember.id);
    }
  }

  return await switchWorkspace(organizationId);
}

export async function transferOrganizationOwnershipAction(params: {
  orgId: string;
  newOwnerEmail: string;
  newOwnerName?: string;
  oldOwnerRole?: 'admin' | 'head_coach' | 'remove';
  createCoachProfile?: boolean;
}) {
  const result = await transferOrganizationOwnership(params);
  if (result.success) {
    revalidatePath('/platform-admin');
    revalidatePath('/', 'layout');
  }
  return result;
}

