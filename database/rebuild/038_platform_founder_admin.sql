-- 038_platform_founder_admin.sql
-- Migration: Platform Founder Administration & Manual Provisioning Architecture
-- Allows founder (aki251098@gmail.com) to provision organizations, manage subscriptions, and oversee platform.

-- 1. Helper function: check if current user is platform founder
CREATE OR REPLACE FUNCTION public.is_platform_founder()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '') = 'aki251098@gmail.com'
    OR
    COALESCE((SELECT email FROM public.profiles WHERE auth_user_id = auth.uid()), '') = 'aki251098@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RLS Policies for Founder across all organizations, members, and profiles
DROP POLICY IF EXISTS "Founder can do all on organizations" ON public.organizations;
CREATE POLICY "Founder can do all on organizations" ON public.organizations
  FOR ALL
  USING (public.is_platform_founder())
  WITH CHECK (public.is_platform_founder());

DROP POLICY IF EXISTS "Founder can do all on organization_members" ON public.organization_members;
CREATE POLICY "Founder can do all on organization_members" ON public.organization_members
  FOR ALL
  USING (public.is_platform_founder())
  WITH CHECK (public.is_platform_founder());

DROP POLICY IF EXISTS "Founder can view all profiles" ON public.profiles;
CREATE POLICY "Founder can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_platform_founder());

-- 3. Stored Procedure: Provision a new organization for an owner email
CREATE OR REPLACE FUNCTION public.platform_provision_organization(
  p_name TEXT,
  p_owner_email TEXT,
  p_plan TEXT DEFAULT 'starter',
  p_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  p_owner_name TEXT DEFAULT NULL,
  p_create_coach BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_org_id UUID;
  v_member_id UUID;
  v_coach_id UUID := NULL;
  v_clean_email TEXT;
  v_display_name TEXT;
BEGIN
  -- 1. Check founder privilege
  IF NOT public.is_platform_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chỉ Nhà sáng lập (Founder) mới có quyền cấp phép trung tâm.');
  END IF;

  v_clean_email := LOWER(TRIM(p_owner_email));
  IF v_clean_email IS NULL OR v_clean_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email chủ trung tâm không được để trống.');
  END IF;

  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tên trung tâm không được để trống.');
  END IF;

  -- 2. Find or create profile for target email
  SELECT id INTO v_profile_id FROM public.profiles WHERE LOWER(email) = v_clean_email LIMIT 1;

  IF v_profile_id IS NULL THEN
    v_display_name := COALESCE(NULLIF(TRIM(p_owner_name), ''), SPLIT_PART(v_clean_email, '@', 1));
    INSERT INTO public.profiles (email, name)
    VALUES (v_clean_email, v_display_name)
    RETURNING id INTO v_profile_id;
  END IF;

  -- 3. Create organization
  INSERT INTO public.organizations (
    name,
    owner_id,
    subscription_plan,
    subscription_status,
    subscription_started_at,
    subscription_expires_at
  ) VALUES (
    TRIM(p_name),
    v_profile_id,
    COALESCE(p_plan, 'starter'),
    'active',
    NOW(),
    COALESCE(p_expires_at, NOW() + INTERVAL '1 year')
  )
  RETURNING id INTO v_org_id;

  -- 4. Create owner membership in organization_members
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    permissions
  ) VALUES (
    v_org_id,
    v_profile_id,
    'owner',
    'active',
    jsonb_build_array(
      'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
      'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
      'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
    )
  )
  RETURNING id INTO v_member_id;

  -- 5. Create coach record if requested (so owner can teach classes at the new center)
  IF p_create_coach THEN
    INSERT INTO public.coaches (
      organization_id,
      organization_member_id,
      status
    ) VALUES (
      v_org_id,
      v_member_id,
      'active'
    )
    RETURNING id INTO v_coach_id;
  END IF;

  -- 6. Set default workspace for profile if none currently set
  UPDATE public.profiles
  SET last_active_workspace = v_org_id
  WHERE id = v_profile_id AND last_active_workspace IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', TRIM(p_name),
    'owner_email', v_clean_email,
    'owner_profile_id', v_profile_id,
    'membership_id', v_member_id,
    'coach_id', v_coach_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Stored Procedure: Get all organizations with platform metrics
CREATE OR REPLACE FUNCTION public.platform_get_all_organizations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_platform_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chỉ Nhà sáng lập (Founder) mới có quyền truy cập.');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'owner_id', o.owner_id,
      'owner_name', COALESCE(p.name, 'Chưa cập nhật'),
      'owner_email', COALESCE(p.email, 'Chưa có email'),
      'subscription_plan', COALESCE(o.subscription_plan, 'starter'),
      'subscription_status', COALESCE(o.subscription_status, 'active'),
      'subscription_started_at', o.subscription_started_at,
      'subscription_expires_at', o.subscription_expires_at,
      'created_at', o.created_at,
      'coaches_count', (SELECT COUNT(*) FROM public.coaches c WHERE c.organization_id = o.id),
      'students_count', (SELECT COUNT(*) FROM public.students s WHERE s.organization_id = o.id),
      'classes_count', (SELECT COUNT(*) FROM public.venue_classes vc WHERE vc.organization_id = o.id)
    ) ORDER BY o.created_at DESC
  ) INTO v_result
  FROM public.organizations o
  LEFT JOIN public.profiles p ON p.id = o.owner_id;

  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_result, '[]'::jsonb));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Stored Procedure: Update subscription status & expiration
CREATE OR REPLACE FUNCTION public.platform_update_organization(
  p_org_id UUID,
  p_status TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_plan TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chỉ Nhà sáng lập (Founder) mới có quyền truy cập.');
  END IF;

  UPDATE public.organizations
  SET 
    subscription_status = COALESCE(p_status, subscription_status),
    subscription_expires_at = COALESCE(p_expires_at, subscription_expires_at),
    subscription_plan = COALESCE(p_plan, subscription_plan),
    updated_at = NOW()
  WHERE id = p_org_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
