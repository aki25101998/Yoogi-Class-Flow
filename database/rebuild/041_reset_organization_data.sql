-- 041_reset_organization_data.sql
-- Migration: Stored Procedure to safely reset all operational and sample data for an organization

CREATE OR REPLACE FUNCTION public.reset_organization_data(p_target_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_profile_id UUID;
  v_owner_member_id UUID;
  v_owner_coach_id UUID;
BEGIN
  -- 1. Security Check: Only admin, owner or platform founder can reset
  IF NOT (public.is_org_admin(p_target_org_id) OR public.is_platform_founder()) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Chỉ Quản trị viên (Admin) hoặc Chủ sở hữu mới có quyền xóa toàn bộ dữ liệu tổ chức.'
    );
  END IF;

  -- 2. Identify Owner to preserve
  SELECT owner_id INTO v_owner_profile_id
  FROM public.organizations
  WHERE id = p_target_org_id;

  IF v_owner_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy tổ chức.');
  END IF;

  SELECT id INTO v_owner_member_id
  FROM public.organization_members
  WHERE organization_id = p_target_org_id AND user_id = v_owner_profile_id;

  IF v_owner_member_id IS NOT NULL THEN
    SELECT id INTO v_owner_coach_id
    FROM public.coaches
    WHERE organization_id = p_target_org_id AND organization_member_id = v_owner_member_id;
  END IF;

  -- 3. Delete Operational Attendance & Sessions
  DELETE FROM public.student_session_attendance WHERE organization_id = p_target_org_id;
  DELETE FROM public.session_coaches WHERE organization_id = p_target_org_id;
  DELETE FROM public.attendance WHERE organization_id = p_target_org_id;
  DELETE FROM public.student_attendance WHERE organization_id = p_target_org_id;
  DELETE FROM public.class_sessions WHERE organization_id = p_target_org_id;

  -- 4. Delete Schedules
  DELETE FROM public.schedule_coaches WHERE organization_id = p_target_org_id;
  DELETE FROM public.schedules WHERE organization_id = p_target_org_id;

  -- 5. Delete Financial & Payroll data
  DELETE FROM public.finance_transactions WHERE organization_id = p_target_org_id;
  DELETE FROM public.tuition WHERE organization_id = p_target_org_id;
  DELETE FROM public.payroll_payment_sessions WHERE organization_id = p_target_org_id;
  DELETE FROM public.payroll_payments WHERE organization_id = p_target_org_id;
  DELETE FROM public.payroll_periods WHERE organization_id = p_target_org_id;
  DELETE FROM public.salary_adjustments WHERE organization_id = p_target_org_id;
  DELETE FROM public.salary_profiles WHERE organization_id = p_target_org_id;
  DELETE FROM public.salary_rule_tiers WHERE organization_id = p_target_org_id;
  DELETE FROM public.salary_rules WHERE organization_id = p_target_org_id;
  DELETE FROM public.salary_audit_logs WHERE organization_id = p_target_org_id;
  DELETE FROM public.teacher_salary_sessions WHERE organization_id = p_target_org_id;
  DELETE FROM public.teacher_salaries WHERE organization_id = p_target_org_id;

  -- 6. Delete Students & Enrollments
  DELETE FROM public.class_students WHERE organization_id = p_target_org_id;
  DELETE FROM public.students WHERE organization_id = p_target_org_id;

  -- 7. Delete Classes & Venues
  DELETE FROM public.class_coaches WHERE organization_id = p_target_org_id;
  DELETE FROM public.venue_classes WHERE organization_id = p_target_org_id;
  DELETE FROM public.venues WHERE organization_id = p_target_org_id;

  -- 8. Delete Belts
  DELETE FROM public.organization_belts WHERE organization_id = p_target_org_id;

  -- 9. Delete Invitations & Other members/coaches (PRESERVING OWNER)
  DELETE FROM public.organization_invitations WHERE organization_id = p_target_org_id;
  
  IF v_owner_coach_id IS NOT NULL THEN
    DELETE FROM public.coaches WHERE organization_id = p_target_org_id AND id != v_owner_coach_id;
  ELSE
    DELETE FROM public.coaches WHERE organization_id = p_target_org_id;
  END IF;

  IF v_owner_member_id IS NOT NULL THEN
    DELETE FROM public.organization_members WHERE organization_id = p_target_org_id AND id != v_owner_member_id;
  ELSE
    DELETE FROM public.organization_members WHERE organization_id = p_target_org_id AND role != 'owner';
  END IF;

  -- 10. Record in version history
  INSERT INTO public.version_history (
    organization_id, 
    version_number, 
    summary, 
    action_type, 
    created_by
  )
  VALUES (
    p_target_org_id, 
    public.get_next_organization_version(p_target_org_id), 
    'Xóa toàn bộ dữ liệu tổ chức (Khôi phục trạng thái trắng khởi tạo)', 
    'RESTORE', 
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Đã xóa toàn bộ dữ liệu tổ chức thành công. Hệ thống đã trở về trạng thái sạch sẽ.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Lỗi khi xóa dữ liệu tổ chức: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_organization_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_organization_data(UUID) TO service_role;
