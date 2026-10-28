-- 040_platform_transfer_ownership.sql
-- Migration: Stored Procedure to Transfer Organization Ownership

CREATE OR REPLACE FUNCTION public.platform_transfer_organization_owner(
  p_org_id UUID,
  p_new_owner_email TEXT,
  p_new_owner_name TEXT DEFAULT NULL,
  p_old_owner_role TEXT DEFAULT 'admin',
  p_create_coach BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner_id UUID;
  v_new_profile_id UUID;
  v_new_member_id UUID;
  v_clean_email TEXT;
  v_display_name TEXT;
  v_new_coach_id UUID := NULL;
BEGIN
  -- 1. Check founder privilege
  IF NOT public.is_platform_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chỉ Nhà sáng lập (Founder) mới có quyền đổi chủ sở hữu.');
  END IF;

  v_clean_email := LOWER(TRIM(p_new_owner_email));
  IF v_clean_email IS NULL OR v_clean_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email chủ mới không được để trống.');
  END IF;

  -- 2. Get current owner of organization
  SELECT owner_id INTO v_old_owner_id
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_old_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy trung tâm.');
  END IF;

  -- 3. Find or create profile for new owner
  SELECT id INTO v_new_profile_id
  FROM public.profiles
  WHERE LOWER(email) = v_clean_email
  LIMIT 1;

  IF v_new_profile_id IS NULL THEN
    v_display_name := COALESCE(NULLIF(TRIM(p_new_owner_name), ''), SPLIT_PART(v_clean_email, '@', 1));
    INSERT INTO public.profiles (email, name)
    VALUES (v_clean_email, v_display_name)
    RETURNING id INTO v_new_profile_id;
  END IF;

  IF v_new_profile_id = v_old_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email này hiện đã là Chủ sở hữu của trung tâm.');
  END IF;

  -- 4. Demote old owner membership to admin (or specified role)
  IF p_old_owner_role = 'remove' THEN
    DELETE FROM public.organization_members
    WHERE organization_id = p_org_id AND user_id = v_old_owner_id;
  ELSE
    UPDATE public.organization_members
    SET 
      role = COALESCE(p_old_owner_role, 'admin'),
      updated_at = NOW()
    WHERE organization_id = p_org_id AND user_id = v_old_owner_id;
  END IF;

  -- 5. Set or update new owner in organization_members
  SELECT id INTO v_new_member_id
  FROM public.organization_members
  WHERE organization_id = p_org_id AND user_id = v_new_profile_id
  LIMIT 1;

  IF v_new_member_id IS NOT NULL THEN
    UPDATE public.organization_members
    SET 
      role = 'owner',
      status = 'active',
      permissions = jsonb_build_array(
        'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
        'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
        'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
      ),
      updated_at = NOW()
    WHERE id = v_new_member_id;
  ELSE
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      permissions
    ) VALUES (
      p_org_id,
      v_new_profile_id,
      'owner',
      'active',
      jsonb_build_array(
        'manage_coaches', 'manage_students', 'manage_venues', 'manage_classes', 
        'manage_schedule', 'manage_settings', 'manage_attendance', 'view_payroll', 
        'manage_members', 'manage_organization', 'manage_tuition', 'manage_finance'
      )
    )
    RETURNING id INTO v_new_member_id;
  END IF;

  -- 6. Update organization owner_id
  UPDATE public.organizations
  SET 
    owner_id = v_new_profile_id,
    updated_at = NOW()
  WHERE id = p_org_id;

  -- 7. Ensure new owner has coach profile if requested
  IF p_create_coach THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coaches 
      WHERE organization_id = p_org_id AND organization_member_id = v_new_member_id
    ) THEN
      INSERT INTO public.coaches (
        organization_id,
        organization_member_id,
        status
      ) VALUES (
        p_org_id,
        v_new_member_id,
        'active'
      )
      RETURNING id INTO v_new_coach_id;
    END IF;
  END IF;

  -- 8. Set default workspace for new owner profile if not set
  UPDATE public.profiles
  SET last_active_workspace = p_org_id
  WHERE id = v_new_profile_id AND last_active_workspace IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'new_owner_email', v_clean_email,
    'new_owner_id', v_new_profile_id,
    'membership_id', v_new_member_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

