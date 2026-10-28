-- 039_platform_admin_enhancements.sql
-- Migration: Enhanced Platform Founder Administration & Stored Procedures

-- 1. Enhanced stored procedure for updating organization with name, plan, status, and expiration
CREATE OR REPLACE FUNCTION public.platform_update_organization(
  p_org_id UUID,
  p_status TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
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
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    subscription_status = COALESCE(p_status, subscription_status),
    subscription_expires_at = CASE 
      WHEN p_expires_at IS NOT NULL THEN p_expires_at
      ELSE subscription_expires_at
    END,
    subscription_plan = COALESCE(p_plan, subscription_plan),
    updated_at = NOW()
  WHERE id = p_org_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Enhanced stored procedure to get all organizations with full metrics
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

