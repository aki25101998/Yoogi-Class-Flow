-- ============================================================
-- 037_student_attendance_rls.sql
-- Fixes Student Session Attendance RLS policies for Coaches
-- and provides atomic public.save_student_attendance RPC
-- ============================================================

-- 1. Ensure RLS is enabled on student_session_attendance
ALTER TABLE public.student_session_attendance ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR student_session_attendance
-- Admin can do everything
DROP POLICY IF EXISTS "Admin can do all on student_session_attendance" ON public.student_session_attendance;
CREATE POLICY "Admin can do all on student_session_attendance" ON public.student_session_attendance 
FOR ALL USING (public.is_org_admin(organization_id));

-- Members can view student attendance in their organization
DROP POLICY IF EXISTS "Members can view student_session_attendance" ON public.student_session_attendance;
CREATE POLICY "Members can view student_session_attendance" ON public.student_session_attendance 
FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- Coaches can insert student attendance for their sessions/classes
DROP POLICY IF EXISTS "Coaches can insert student_session_attendance" ON public.student_session_attendance;
CREATE POLICY "Coaches can insert student_session_attendance" ON public.student_session_attendance 
FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations()) AND (
    session_id IN (
      SELECT cs.id FROM public.class_sessions cs
      WHERE cs.organization_id = organization_id AND (
        cs.coach_id IN (SELECT public.get_my_coach_id()) OR
        cs.class_id IN (SELECT public.get_my_class_ids()) OR
        cs.id IN (SELECT sc.session_id FROM public.session_coaches sc WHERE sc.coach_id IN (SELECT public.get_my_coach_id()))
      )
    )
  )
);

-- Coaches can update student attendance for their sessions/classes
DROP POLICY IF EXISTS "Coaches can update student_session_attendance" ON public.student_session_attendance;
CREATE POLICY "Coaches can update student_session_attendance" ON public.student_session_attendance 
FOR UPDATE USING (
  organization_id IN (SELECT public.get_user_organizations()) AND (
    session_id IN (
      SELECT cs.id FROM public.class_sessions cs
      WHERE cs.organization_id = organization_id AND (
        cs.coach_id IN (SELECT public.get_my_coach_id()) OR
        cs.class_id IN (SELECT public.get_my_class_ids()) OR
        cs.id IN (SELECT sc.session_id FROM public.session_coaches sc WHERE sc.coach_id IN (SELECT public.get_my_coach_id()))
      )
    )
  )
) WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations())
);

-- 3. RPC FUNCTION FOR ATOMIC AND RESILIENT ATTENDANCE SAVING
CREATE OR REPLACE FUNCTION public.save_student_attendance(
    p_organization_id UUID,
    p_session_id UUID,
    p_records JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_coach_id UUID;
    v_is_admin BOOLEAN;
    v_session RECORD;
    v_item JSONB;
    v_student_id UUID;
    v_status TEXT;
    v_note TEXT;
BEGIN
    -- 1. Check authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Chưa đăng nhập.');
    END IF;

    -- 2. Verify membership
    SELECT public.is_org_admin(p_organization_id) INTO v_is_admin;

    SELECT p.id, c.id INTO v_profile_id, v_coach_id
    FROM public.profiles p
    JOIN public.organization_members om ON om.user_id = p.id
    LEFT JOIN public.coaches c ON c.organization_member_id = om.id
    WHERE p.auth_user_id = v_user_id
      AND om.organization_id = p_organization_id
      AND om.status = 'active'
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bạn không thuộc tổ chức này.');
    END IF;

    -- 3. Find and validate session
    SELECT id, class_id, status, coach_id INTO v_session
    FROM public.class_sessions
    WHERE id = p_session_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy ca học.');
    END IF;

    IF v_session.status IN ('approved', 'paid', 'cancelled') THEN
        RETURN json_build_object('success', false, 'error', 'Buổi học đã khóa, không thể sửa điểm danh.');
    END IF;

    -- If not admin, verify coach is assigned to class/session
    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.class_coaches WHERE class_id = v_session.class_id AND coach_id = v_coach_id
        ) AND NOT EXISTS (
            SELECT 1 FROM public.session_coaches WHERE session_id = p_session_id AND coach_id = v_coach_id
        ) AND (v_session.coach_id IS NULL OR v_session.coach_id != v_coach_id) THEN
            -- Check if class has no assigned coaches, allow
            IF EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_session.class_id) THEN
                RETURN json_build_object('success', false, 'error', 'Bạn không được phân công phụ trách lớp học này.');
            END IF;
        END IF;
    END IF;

    -- 4. Upsert attendance records
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        v_student_id := (v_item->>'student_id')::UUID;
        v_status := COALESCE(v_item->>'status', 'present');
        IF v_status = 'pending' THEN
            v_status := 'present';
        END IF;
        v_note := COALESCE(v_item->>'note', '');

        -- Ensure student belongs to class
        IF EXISTS (
            SELECT 1 FROM public.class_students 
            WHERE class_id = v_session.class_id AND student_id = v_student_id AND status = 'active'
        ) THEN
            INSERT INTO public.student_session_attendance (
                organization_id, session_id, student_id, status, note, marked_by, marked_at
            ) VALUES (
                p_organization_id, p_session_id, v_student_id, v_status, v_note, v_profile_id, NOW()
            )
            ON CONFLICT (session_id, student_id)
            DO UPDATE SET
                status = EXCLUDED.status,
                note = EXCLUDED.note,
                marked_by = EXCLUDED.marked_by,
                marked_at = NOW(),
                updated_at = NOW();
        END IF;
    END LOOP;

    RETURN json_build_object('success', true);
END;
$$;
