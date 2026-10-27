-- ============================================================
-- 036_coach_checkin_and_sessions_rls.sql
-- Fixes Coach Check-in RLS policies and multi-coach session permissions
-- ============================================================

-- 1. Ensure RLS is enabled on class_sessions, session_coaches, schedule_coaches
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_coaches ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR class_sessions
-- Admin can do everything
DROP POLICY IF EXISTS "Admin can do all on teacher_salary_sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Admin can do all on class_sessions" ON public.class_sessions;
CREATE POLICY "Admin can do all on class_sessions" ON public.class_sessions 
FOR ALL USING (public.is_org_admin(organization_id));

-- Coaches can view sessions belonging to their organization if they are assigned to the class,
-- listed as primary coach, or listed in session_coaches
DROP POLICY IF EXISTS "Coaches can view own salary sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Coaches can view assigned class_sessions" ON public.class_sessions;
CREATE POLICY "Coaches can view assigned class_sessions" ON public.class_sessions 
FOR SELECT USING (
  organization_id IN (SELECT public.get_user_organizations()) AND (
    coach_id IN (SELECT public.get_my_coach_id()) OR
    class_id IN (SELECT public.get_my_class_ids()) OR
    id IN (SELECT sc.session_id FROM public.session_coaches sc WHERE sc.coach_id IN (SELECT public.get_my_coach_id()))
  )
);

-- Coaches can insert class_sessions (e.g. Check-in for their assigned classes)
DROP POLICY IF EXISTS "Coaches can insert checkin on class_sessions" ON public.class_sessions;
CREATE POLICY "Coaches can insert checkin on class_sessions" ON public.class_sessions 
FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations()) AND (
    class_id IN (SELECT public.get_my_class_ids()) OR
    coach_id IN (SELECT public.get_my_coach_id())
  )
);

-- Coaches can update class_sessions (e.g. Check-in for their assigned classes)
DROP POLICY IF EXISTS "Coaches can update checkin on class_sessions" ON public.class_sessions;
CREATE POLICY "Coaches can update checkin on class_sessions" ON public.class_sessions 
FOR UPDATE USING (
  organization_id IN (SELECT public.get_user_organizations()) AND (
    class_id IN (SELECT public.get_my_class_ids()) OR
    coach_id IN (SELECT public.get_my_coach_id()) OR
    id IN (SELECT sc.session_id FROM public.session_coaches sc WHERE sc.coach_id IN (SELECT public.get_my_coach_id()))
  )
) WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations())
);

-- 3. POLICIES FOR session_coaches
DROP POLICY IF EXISTS "Admin can do all on session_coaches" ON public.session_coaches;
CREATE POLICY "Admin can do all on session_coaches" ON public.session_coaches 
FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Members can view session_coaches" ON public.session_coaches;
CREATE POLICY "Members can view session_coaches" ON public.session_coaches 
FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Coaches can insert own session_coaches" ON public.session_coaches;
CREATE POLICY "Coaches can insert own session_coaches" ON public.session_coaches 
FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_user_organizations()) AND
  coach_id IN (SELECT public.get_my_coach_id())
);

DROP POLICY IF EXISTS "Coaches can update own session_coaches" ON public.session_coaches;
CREATE POLICY "Coaches can update own session_coaches" ON public.session_coaches 
FOR UPDATE USING (
  organization_id IN (SELECT public.get_user_organizations()) AND
  coach_id IN (SELECT public.get_my_coach_id())
);

-- 4. POLICIES FOR schedule_coaches
DROP POLICY IF EXISTS "Admin can do all on schedule_coaches" ON public.schedule_coaches;
CREATE POLICY "Admin can do all on schedule_coaches" ON public.schedule_coaches 
FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Members can view schedule_coaches" ON public.schedule_coaches;
CREATE POLICY "Members can view schedule_coaches" ON public.schedule_coaches 
FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 5. RPC FUNCTION FOR ATOMIC AND RESILIENT CHECK-IN
CREATE OR REPLACE FUNCTION public.checkin_session(
    p_organization_id UUID,
    p_class_id UUID,
    p_date TEXT,
    p_schedule_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_coach_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_coach_id UUID;
    v_is_admin BOOLEAN;
    v_session_id UUID;
    v_existing_session RECORD;
    v_schedule RECORD;
    v_class RECORD;
    v_start_time TEXT;
    v_end_time TEXT;
    v_original_coach_id UUID;
BEGIN
    -- 1. Check authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Chưa đăng nhập.');
    END IF;

    -- 2. Verify membership in organization
    SELECT public.is_org_admin(p_organization_id) INTO v_is_admin;

    -- Resolve coach_id for current user
    SELECT c.id INTO v_coach_id
    FROM public.coaches c
    JOIN public.organization_members om ON om.id = c.organization_member_id
    JOIN public.profiles p ON p.id = om.user_id
    WHERE p.auth_user_id = v_user_id
      AND om.organization_id = p_organization_id
      AND om.status = 'active'
    LIMIT 1;

    -- If caller passed a coach_id and caller is admin, they can check in on behalf
    IF v_is_admin AND p_coach_id IS NOT NULL THEN
        v_coach_id := p_coach_id;
    END IF;

    -- If not admin and no coach profile found, deny
    IF NOT v_is_admin AND v_coach_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bạn chưa được liên kết với hồ sơ HLV trong tổ chức.');
    END IF;

    -- Verify coach is assigned to class or schedule (if not admin)
    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.class_coaches WHERE class_id = p_class_id AND coach_id = v_coach_id
        ) AND NOT EXISTS (
            SELECT 1 FROM public.schedule_coaches WHERE schedule_id = p_schedule_id AND coach_id = v_coach_id
        ) AND NOT EXISTS (
            SELECT 1 FROM public.schedules WHERE id = p_schedule_id AND coach_id = v_coach_id
        ) AND NOT EXISTS (
            SELECT 1 FROM public.session_coaches WHERE session_id = p_session_id AND coach_id = v_coach_id
        ) THEN
            -- Check if class has no assigned coaches at all, allow check-in
            IF EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = p_class_id) THEN
                RETURN json_build_object('success', false, 'error', 'Bạn không được phân công dạy lớp học này.');
            END IF;
        END IF;
    END IF;

    -- Case A: Existing sessionId provided
    IF p_session_id IS NOT NULL THEN
        SELECT id, coach_id, status INTO v_existing_session
        FROM public.class_sessions
        WHERE id = p_session_id AND organization_id = p_organization_id;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Không tìm thấy ca học.');
        END IF;

        UPDATE public.class_sessions
        SET status = 'checked_in',
            check_in_time = NOW()
        WHERE id = p_session_id;

        -- Dual write to session_coaches
        IF v_coach_id IS NOT NULL THEN
            INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status)
            VALUES (p_organization_id, p_session_id, v_coach_id, 'checked_in')
            ON CONFLICT (session_id, coach_id) 
            DO UPDATE SET status = 'checked_in';
        END IF;

        RETURN json_build_object('success', true, 'session_id', p_session_id);
    END IF;

    -- Case B: Virtual session -> find or create class_session
    IF p_schedule_id IS NOT NULL THEN
        SELECT id, coach_id, start_time, end_time INTO v_schedule
        FROM public.schedules
        WHERE id = p_schedule_id AND organization_id = p_organization_id;

        IF FOUND THEN
            v_start_time := v_schedule.start_time;
            v_end_time := v_schedule.end_time;
            v_original_coach_id := v_schedule.coach_id;
        END IF;
    END IF;

    -- Fallback time from class if not found
    IF v_start_time IS NULL THEN
        SELECT start_time, end_time INTO v_class
        FROM public.venue_classes
        WHERE id = p_class_id AND organization_id = p_organization_id;

        IF FOUND THEN
            v_start_time := v_class.start_time;
            v_end_time := v_class.end_time;
        END IF;
    END IF;

    -- Check if session already exists for this (schedule_id, date)
    IF p_schedule_id IS NOT NULL THEN
        SELECT id INTO v_session_id
        FROM public.class_sessions
        WHERE organization_id = p_organization_id
          AND schedule_id = p_schedule_id
          AND date = p_date
        LIMIT 1;
    END IF;

    IF v_session_id IS NOT NULL THEN
        UPDATE public.class_sessions
        SET status = 'checked_in',
            check_in_time = NOW()
        WHERE id = v_session_id;
    ELSE
        INSERT INTO public.class_sessions (
            organization_id, class_id, schedule_id, date,
            start_time, end_time, status, check_in_time,
            coach_id, original_coach_id
        ) VALUES (
            p_organization_id, p_class_id, p_schedule_id, p_date,
            v_start_time, v_end_time, 'checked_in', NOW(),
            COALESCE(v_original_coach_id, v_coach_id), v_original_coach_id
        ) RETURNING id INTO v_session_id;
    END IF;

    -- Insert into session_coaches
    IF v_coach_id IS NOT NULL AND v_session_id IS NOT NULL THEN
        INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status)
        VALUES (p_organization_id, v_session_id, v_coach_id, 'checked_in')
        ON CONFLICT (session_id, coach_id)
        DO UPDATE SET status = 'checked_in';
    END IF;

    RETURN json_build_object('success', true, 'session_id', v_session_id);
END;
$$;
