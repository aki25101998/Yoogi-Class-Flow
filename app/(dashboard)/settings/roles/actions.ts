'use server';

import { 
  getOrganizationRoles, 
  saveOrganizationRole, 
  deleteOrganizationRole, 
  resetRolePermissionsToDefault 
} from '@/services/roles.service';
import { OrganizationRole } from '@/types/organization';

export async function getRolesAction() {
  return await getOrganizationRoles();
}

export async function saveRoleAction(data: {
  id?: string;
  name: string;
  code?: string;
  base_role: OrganizationRole;
  description?: string;
  permissions: string[];
}) {
  return await saveOrganizationRole(data);
}

export async function deleteRoleAction(roleId: string, roleCode: string) {
  return await deleteOrganizationRole(roleId, roleCode);
}

export async function resetRoleAction(roleCode: OrganizationRole) {
  return await resetRolePermissionsToDefault(roleCode);
}
