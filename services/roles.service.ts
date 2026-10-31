import { createClient } from '@/utils/supabase/server';
import { OrganizationRole, OrganizationRoleDefinition } from '@/types/organization';
import { getCurrentOrganizationContext } from './organization.service';

export const ALL_SYSTEM_PERMISSIONS = [
  { key: 'manage_coaches', label: 'Huấn luyện viên', group: 'Vận hành & Đào tạo', description: 'Xem, thêm mới, quản lý hồ sơ HLV' },
  { key: 'manage_students', label: 'Học viên', group: 'Vận hành & Đào tạo', description: 'Quản lý học viên, thêm mới và phân lớp' },
  { key: 'manage_venues', label: 'Cơ sở & Lớp học', group: 'Vận hành & Đào tạo', description: 'Quản lý chi nhánh đào tạo và danh sách lớp' },
  { key: 'manage_schedule', label: 'Lịch dạy tuần', group: 'Lịch dạy & Điểm danh', description: 'Xếp lịch, điều phối ca dạy và phân công HLV' },
  { key: 'manage_attendance', label: 'Quản lý điểm danh', group: 'Lịch dạy & Điểm danh', description: 'Xem, sửa điểm danh và duyệt buổi học' },
  { key: 'view_payroll', label: 'Bảng lương HLV', group: 'Tài chính & Lương', description: 'Xem bảng lương, chốt lương và cấu hình lương' },
  { key: 'manage_tuition', label: 'Học phí', group: 'Tài chính & Lương', description: 'Quản lý đợt thu phí, thu tiền và công nợ' },
  { key: 'manage_finance', label: 'Sổ quỹ thu chi', group: 'Tài chính & Lương', description: 'Ghi chép thu chi và xem báo cáo dòng tiền' },
  { key: 'manage_members', label: 'Đội ngũ & Phân quyền', group: 'Hệ thống & Cài đặt', description: 'Mời thành viên, chỉnh sửa vai trò và phân quyền' },
  { key: 'manage_settings', label: 'Cài đặt trung tâm', group: 'Hệ thống & Cài đặt', description: 'Cấu hình trung tâm, cấp đai và phiên bản' }
];

export const DEFAULT_ROLES_CONFIG = [
  {
    code: 'owner',
    name: 'Chủ trung tâm',
    base_role: 'owner' as OrganizationRole,
    description: 'Toàn quyền sở hữu và quản lý trung tâm',
    is_system: true,
    permissions: [
      'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes',
      'manage_schedule', 'manage_settings', 'manage_attendance',
      'view_payroll', 'manage_members', 'manage_tuition', 'manage_finance', 'manage_organization'
    ]
  },
  {
    code: 'admin',
    name: 'Quản trị viên',
    base_role: 'admin' as OrganizationRole,
    description: 'Quản lý vận hành toàn diện và điều phối thành viên',
    is_system: true,
    permissions: [
      'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes',
      'manage_schedule', 'manage_settings', 'manage_attendance',
      'view_payroll', 'manage_members', 'manage_tuition', 'manage_finance'
    ]
  },
  {
    code: 'head_coach',
    name: 'HLV trưởng',
    base_role: 'head_coach' as OrganizationRole,
    description: 'Quản lý hoạt động chuyên môn, lịch dạy và lớp học',
    is_system: true,
    permissions: [
      'manage_students', 'manage_venues', 'manage_schedule', 'manage_attendance'
    ]
  },
  {
    code: 'assistant_coach',
    name: 'HLV phụ',
    base_role: 'assistant_coach' as OrganizationRole,
    description: 'Thực hiện các hoạt động được phân công và điểm danh lớp',
    is_system: true,
    permissions: [
      'manage_attendance'
    ]
  }
];

export async function getOrganizationRoles(): Promise<{
  success: boolean;
  roles: OrganizationRoleDefinition[];
  membersByRole: Record<string, number>;
  error?: string;
}> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) {
    return { success: false, roles: [], membersByRole: {}, error: 'Chưa đăng nhập hoặc không có tổ chức.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // 1. Count members by role and custom_role_title
  const { data: members } = await supabase
    .from('organization_members')
    .select('role, custom_role_title, permissions')
    .eq('organization_id', orgId)
    .neq('status', 'removed');

  const membersByRole: Record<string, number> = {};
  (members || []).forEach(m => {
    // Check custom title first
    const customTitle = m.custom_role_title || 
      (m.permissions?.find((p: string) => typeof p === 'string' && p.startsWith('title:'))?.replace('title:', ''));
    
    if (customTitle && customTitle.trim()) {
      const key = `custom:${customTitle.trim().toLowerCase()}`;
      membersByRole[key] = (membersByRole[key] || 0) + 1;
    } else if (m.role) {
      membersByRole[m.role] = (membersByRole[m.role] || 0) + 1;
    }
  });

  // 2. Fetch from organization_roles table if it exists
  let dbRoles: OrganizationRoleDefinition[] = [];
  try {
    const { data, error } = await supabase
      .from('organization_roles')
      .select('*')
      .eq('organization_id', orgId)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      dbRoles = data.map(r => ({
        ...r,
        permissions: Array.isArray(r.permissions) ? r.permissions : []
      }));
    }
  } catch (e) {
    console.warn('organization_roles table might not exist yet, using memory fallback');
  }

  // 3. If DB has roles, return them merged with member counts
  if (dbRoles.length > 0) {
    const enrichedRoles = dbRoles.map(r => {
      const count = r.is_system 
        ? (membersByRole[r.code] || 0)
        : (membersByRole[`custom:${r.name.toLowerCase()}`] || membersByRole[r.code] || 0);
      return {
        ...r,
        member_count: count
      };
    });
    return { success: true, roles: enrichedRoles, membersByRole };
  }

  // 4. Default fallback: synthesize default roles
  const synthesizedRoles: OrganizationRoleDefinition[] = DEFAULT_ROLES_CONFIG.map(def => ({
    id: `default-${def.code}`,
    organization_id: orgId,
    name: def.name,
    code: def.code,
    base_role: def.base_role,
    description: def.description,
    permissions: def.permissions,
    is_system: true,
    member_count: membersByRole[def.code] || 0
  }));

  // Also include any custom role titles currently in use by members
  Object.keys(membersByRole).forEach(key => {
    if (key.startsWith('custom:')) {
      const roleName = key.replace('custom:', '');
      const capitalized = roleName.charAt(0).toUpperCase() + roleName.slice(1);
      synthesizedRoles.push({
        id: `custom-${roleName}`,
        organization_id: orgId,
        name: capitalized,
        code: roleName.replace(/\s+/g, '_'),
        base_role: 'assistant_coach',
        description: `Vai trò tùy chỉnh đang áp dụng cho ${membersByRole[key]} thành viên`,
        permissions: ['manage_attendance'],
        is_system: false,
        member_count: membersByRole[key]
      });
    }
  });

  return { success: true, roles: synthesizedRoles, membersByRole };
}

export async function saveOrganizationRole(data: {
  id?: string;
  name: string;
  code?: string;
  base_role: OrganizationRole;
  description?: string;
  permissions: string[];
}): Promise<{ success: boolean; error?: string; roleId?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) {
    return { success: false, error: 'Chưa đăng nhập hoặc không có tổ chức.' };
  }

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Chỉ Quản trị viên hoặc Chủ trung tâm mới có quyền chỉnh sửa vai trò.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const roleCode = data.code || data.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const isSystem = DEFAULT_ROLES_CONFIG.some(d => d.code === (data.code || data.base_role));

  const rolePayload = {
    organization_id: orgId,
    name: data.name.trim(),
    code: roleCode,
    base_role: data.base_role,
    description: data.description?.trim() || '',
    permissions: data.permissions,
    is_system: isSystem,
    updated_at: new Date().toISOString()
  };

  // Try updating or inserting into organization_roles
  try {
    if (data.id && !data.id.startsWith('default-') && !data.id.startsWith('custom-')) {
      const { error } = await supabase
        .from('organization_roles')
        .update(rolePayload)
        .eq('id', data.id)
        .eq('organization_id', orgId);

      if (error) {
        console.warn('Error updating organization_roles', error);
      }
    } else {
      const { data: newRow, error } = await supabase
        .from('organization_roles')
        .upsert({ ...rolePayload, created_at: new Date().toISOString() }, { onConflict: 'organization_id, code' })
        .select()
        .single();

      if (error) {
        console.warn('Error upserting organization_roles', error);
      }
    }
  } catch (e) {
    console.warn('organization_roles table not accessible', e);
  }

  // Synchronize permissions to active members who hold this role or custom title
  try {
    if (isSystem) {
      // Update permissions of members with this system role (who do not have a custom title overriding it)
      await supabase
        .from('organization_members')
        .update({ permissions: data.permissions })
        .eq('organization_id', orgId)
        .eq('role', data.base_role)
        .or('custom_role_title.is.null,custom_role_title.eq.');
    } else {
      // Update permissions of members with this custom title
      const titleTag = `title:${data.name.trim()}`;
      const permsWithTag = [...data.permissions.filter(p => !p.startsWith('title:')), titleTag];

      await supabase
        .from('organization_members')
        .update({ permissions: permsWithTag, role: data.base_role })
        .eq('organization_id', orgId)
        .eq('custom_role_title', data.name.trim());
    }
  } catch (syncErr) {
    console.warn('Failed to sync members permissions', syncErr);
  }

  return { success: true };
}

export async function deleteOrganizationRole(roleId: string, roleCode: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) {
    return { success: false, error: 'Chưa đăng nhập.' };
  }

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Chỉ Quản trị viên hoặc Chủ trung tâm mới có quyền xóa vai trò.' };
  }

  if (DEFAULT_ROLES_CONFIG.some(d => d.code === roleCode)) {
    return { success: false, error: 'Không thể xóa các vai trò cốt lõi của hệ thống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  try {
    await supabase
      .from('organization_roles')
      .delete()
      .eq('id', roleId)
      .eq('organization_id', orgId);
  } catch (e: any) {
    console.warn('Error deleting role from table', e);
  }

  return { success: true };
}

export async function resetRolePermissionsToDefault(roleCode: OrganizationRole): Promise<{ success: boolean; error?: string }> {
  const defaultConfig = DEFAULT_ROLES_CONFIG.find(d => d.code === roleCode);
  if (!defaultConfig) {
    return { success: false, error: 'Không tìm thấy vai trò mặc định.' };
  }

  return await saveOrganizationRole({
    name: defaultConfig.name,
    code: defaultConfig.code,
    base_role: defaultConfig.base_role,
    description: defaultConfig.description,
    permissions: defaultConfig.permissions
  });
}

