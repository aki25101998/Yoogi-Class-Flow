import { redirect } from 'next/navigation';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { getOrganizationRoles } from '@/services/roles.service';
import RolesClient from './RolesClient';

export default async function RolesPage() {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.organization) {
    redirect('/login');
  }

  // Permission check
  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasSettingsPerm = context.permissions?.includes('manage_settings') || context.permissions?.includes('manage_members');

  if (!isAdminOrOwner && !hasSettingsPerm) {
    redirect('/dashboard');
  }

  const { roles, membersByRole } = await getOrganizationRoles();

  return (
    <RolesClient 
      initialRoles={roles || []}
      membersByRole={membersByRole || {}}
      currentUserRole={context.membership?.role}
    />
  );
}

