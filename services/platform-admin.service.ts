import { createClient } from '@/utils/supabase/server';

export const FOUNDER_EMAIL = 'aki251098@gmail.com';

export function isFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === FOUNDER_EMAIL.toLowerCase();
}

export interface PlatformOrganization {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  subscription_plan: string;
  subscription_status: 'active' | 'trial' | 'expired' | 'suspended';
  subscription_started_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  coaches_count?: number;
  students_count?: number;
  classes_count?: number;
}

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  expiredOrganizations: number;
  totalCoaches: number;
  totalStudents: number;
  totalClasses: number;
}

export async function verifyFounderAccess(): Promise<{ isAuthorized: boolean; email?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { isAuthorized: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập với tài khoản Founder.' };
  }

  if (!isFounderEmail(user.email)) {
    return { 
      isAuthorized: false, 
      email: user.email, 
      error: `Truy cập bị từ chối: Tài khoản ${user.email} không phải là Nhà sáng lập (${FOUNDER_EMAIL}).` 
    };
  }

  return { isAuthorized: true, email: user.email };
}

export async function getPlatformOrganizations(): Promise<{ success: boolean; data: PlatformOrganization[]; stats: PlatformStats; error?: string }> {
  const auth = await verifyFounderAccess();
  if (!auth.isAuthorized) {
    return {
      success: false,
      data: [],
      stats: { totalOrganizations: 0, activeOrganizations: 0, expiredOrganizations: 0, totalCoaches: 0, totalStudents: 0, totalClasses: 0 },
      error: auth.error
    };
  }

  const supabase = await createClient();

  // 1. Try RPC first
  const { data: rpcResult, error: rpcError } = await supabase.rpc('platform_get_all_organizations');

  let orgList: PlatformOrganization[] = [];

  if (!rpcError && rpcResult?.success && Array.isArray(rpcResult.data)) {
    orgList = rpcResult.data;
  } else {
    // 2. Fallback direct query
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        owner_id,
        subscription_plan,
        subscription_status,
        subscription_started_at,
        subscription_expires_at,
        created_at,
        owner:profiles!organizations_owner_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return {
        success: false,
        data: [],
        stats: { totalOrganizations: 0, activeOrganizations: 0, expiredOrganizations: 0, totalCoaches: 0, totalStudents: 0, totalClasses: 0 },
        error: fetchError.message
      };
    }

    // Map to PlatformOrganization
    orgList = (orgs || []).map((o: any) => ({
      id: o.id,
      name: o.name,
      owner_id: o.owner_id,
      owner_name: o.owner?.name || 'Chưa cập nhật',
      owner_email: o.owner?.email || 'Chưa có email',
      subscription_plan: o.subscription_plan || 'starter',
      subscription_status: o.subscription_status || 'active',
      subscription_started_at: o.subscription_started_at,
      subscription_expires_at: o.subscription_expires_at,
      created_at: o.created_at,
      coaches_count: 0,
      students_count: 0,
      classes_count: 0
    }));
  }

  // Calculate statistics accurately
  const now = new Date().getTime();
  let activeCount = 0;
  let expiredOrSuspendedCount = 0;
  let totalCoaches = 0;
  let totalStudents = 0;
  let totalClasses = 0;

  for (const org of orgList) {
    totalCoaches += org.coaches_count || 0;
    totalStudents += org.students_count || 0;
    totalClasses += org.classes_count || 0;

    const isExpired = org.subscription_expires_at && new Date(org.subscription_expires_at).getTime() < now;
    const isSuspended = org.subscription_status === 'suspended';

    if (isSuspended || org.subscription_status === 'expired' || isExpired) {
      expiredOrSuspendedCount++;
    } else {
      activeCount++;
    }
  }

  return {
    success: true,
    data: orgList,
    stats: {
      totalOrganizations: orgList.length,
      activeOrganizations: activeCount,
      expiredOrganizations: expiredOrSuspendedCount,
      totalCoaches,
      totalStudents,
      totalClasses
    }
  };
}

export async function provisionOrganization(params: {
  name: string;
  ownerEmail: string;
  ownerName?: string;
  plan: string;
  durationMonths: number;
  createCoachProfile?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const auth = await verifyFounderAccess();
  if (!auth.isAuthorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const cleanEmail = params.ownerEmail.toLowerCase().trim();
  const cleanName = params.name.trim();

  if (!cleanEmail) {
    return { success: false, error: 'Email chủ trung tâm không được để trống.' };
  }
  if (!cleanName) {
    return { success: false, error: 'Tên trung tâm không được để trống.' };
  }

  // Calculate expiration date
  let expiresAt: Date | null = new Date();
  if (params.durationMonths <= 0 || params.durationMonths >= 120) {
    // 10 years / unlimited
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + (params.durationMonths || 12));
  }

  // 1. Try RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('platform_provision_organization', {
    p_name: cleanName,
    p_owner_email: cleanEmail,
    p_plan: params.plan || 'starter',
    p_expires_at: expiresAt ? expiresAt.toISOString() : null,
    p_owner_name: params.ownerName || null,
    p_create_coach: params.createCoachProfile !== false
  });

  if (!rpcErr && rpcRes?.success) {
    return { success: true, data: rpcRes };
  }

  // 2. Direct fallback if RPC fails or not migrated yet
  try {
    // 2.1 Find or create profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!profile) {
      const displayName = params.ownerName || cleanEmail.split('@')[0];
      const { data: newProfile, error: profileErr } = await supabase
        .from('profiles')
        .insert([{ email: cleanEmail, name: displayName }])
        .select()
        .single();

      if (profileErr) return { success: false, error: `Lỗi tạo hồ sơ: ${profileErr.message}` };
      profile = newProfile;
    }

    if (!profile) return { success: false, error: 'Không tìm thấy hoặc không tạo được hồ sơ người dùng.' };

    // 2.2 Create organization
    const { data: newOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert([{
        name: cleanName,
        owner_id: profile.id,
        subscription_plan: params.plan || 'starter',
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
        subscription_expires_at: expiresAt ? expiresAt.toISOString() : null
      }])
      .select()
      .single();

    if (orgErr) return { success: false, error: `Lỗi tạo trung tâm: ${orgErr.message}` };

    // 2.3 Create owner membership
    const permissions = [
      'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
      'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
      'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
    ];

    const { data: member, error: memberErr } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: newOrg.id,
        user_id: profile.id,
        role: 'owner',
        status: 'active',
        permissions
      }])
      .select()
      .single();

    if (memberErr) return { success: false, error: `Lỗi gán vai trò Chủ trung tâm: ${memberErr.message}` };

    // 2.4 Create coach record if requested
    if (params.createCoachProfile !== false && member) {
      await supabase.from('coaches').insert([{
        organization_id: newOrg.id,
        organization_member_id: member.id,
        status: 'active'
      }]);
    }

    return { 
      success: true, 
      data: { 
        organization_id: newOrg.id, 
        organization_name: newOrg.name, 
        owner_email: cleanEmail 
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi không xác định khi kích hoạt trung tâm.' };
  }
}

export async function updateOrganizationStatus(
  orgId: string, 
  status?: 'active' | 'expired' | 'suspended',
  addMonths?: number,
  plan?: string,
  exactExpiresAt?: string | null,
  name?: string
): Promise<{ success: boolean; newExpiresAt?: string | null; error?: string }> {
  const auth = await verifyFounderAccess();
  if (!auth.isAuthorized) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  let expiresAtIso: string | null | undefined = undefined;

  if (exactExpiresAt !== undefined) {
    expiresAtIso = exactExpiresAt;
  } else if (addMonths && addMonths > 0) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_expires_at')
      .eq('id', orgId)
      .single();

    const baseDate = org?.subscription_expires_at && new Date(org.subscription_expires_at) > new Date()
      ? new Date(org.subscription_expires_at)
      : new Date();
    
    baseDate.setMonth(baseDate.getMonth() + addMonths);
    expiresAtIso = baseDate.toISOString();
  }

  // 1. Try RPC with enhanced parameters
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('platform_update_organization', {
    p_org_id: orgId,
    p_status: status || null,
    p_expires_at: expiresAtIso !== undefined ? expiresAtIso : null,
    p_plan: plan || null,
    p_name: name || null
  });

  if (!rpcErr && rpcRes?.success) {
    return { success: true, newExpiresAt: expiresAtIso };
  }

  // 2. Direct fallback
  const updatePayload: any = {
    updated_at: new Date().toISOString()
  };
  if (status) updatePayload.subscription_status = status;
  if (expiresAtIso !== undefined) updatePayload.subscription_expires_at = expiresAtIso;
  if (plan) updatePayload.subscription_plan = plan;
  if (name && name.trim()) updatePayload.name = name.trim();

  const { error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, newExpiresAt: expiresAtIso };
}
