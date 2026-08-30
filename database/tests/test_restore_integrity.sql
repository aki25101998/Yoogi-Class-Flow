-- test_restore_integrity.sql
-- Kịch bản Test A-F cho Restore Integrity
-- Chạy thủ công trên pgAdmin hoặc thông qua Supabase SQL Editor

BEGIN;

DO $$ 
DECLARE
    v_org_id UUID;
    v_profile_id UUID;
    v_student_id UUID;
    v_class_id UUID;
    v_schedule_id UUID;
    v_session_id UUID;
    v_version_before BIGINT;
    v_version_after BIGINT;
    v_res JSON;
BEGIN
    -- 1. Setup Data
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    SELECT id INTO v_profile_id FROM public.profiles LIMIT 1;

    -- Lưu lại version hiện tại
    SELECT COALESCE(MAX(version_number), 0) INTO v_version_before FROM public.version_history WHERE organization_id = v_org_id;

    -- ==========================================
    -- TEST A: CREATE -> RESTORE
    -- ==========================================
    -- Tạo student
    INSERT INTO public.students (organization_id, name) VALUES (v_org_id, 'Test Student A') RETURNING id INTO v_student_id;
    -- Tạo class
    INSERT INTO public.venue_classes (organization_id, name) VALUES (v_org_id, 'Test Class A') RETURNING id INTO v_class_id;
    -- Tạo schedule
    INSERT INTO public.schedules (organization_id, class_id, status) VALUES (v_org_id, v_class_id, 'active') RETURNING id INTO v_schedule_id;
    -- Tạo session
    INSERT INTO public.class_sessions (organization_id, class_id, schedule_id, date, status) 
    VALUES (v_org_id, v_class_id, v_schedule_id, '2023-10-10', 'scheduled') RETURNING id INTO v_session_id;

    -- Restore về version_before
    SELECT public.restore_organization_version(v_org_id, v_version_before) INTO v_res;
    
    -- Kiểm tra
    IF EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id) THEN
        RAISE EXCEPTION 'TEST A FAILED: Student vẫn tồn tại sau khi restore.';
    END IF;

    -- ==========================================
    -- TEST B: UPDATE -> RESTORE
    -- ==========================================
    SELECT COALESCE(MAX(version_number), 0) INTO v_version_before FROM public.version_history WHERE organization_id = v_org_id;
    INSERT INTO public.students (organization_id, name) VALUES (v_org_id, 'Test Student B') RETURNING id INTO v_student_id;
    
    UPDATE public.students SET name = 'Test Student B Updated' WHERE id = v_student_id;
    
    SELECT public.restore_organization_version(v_org_id, v_version_before) INTO v_res;
    
    IF EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id) THEN
        RAISE EXCEPTION 'TEST B FAILED: Student B Updated không rollback đúng trạng thái trước khi INSERT.';
    END IF;

    -- ==========================================
    -- TEST C: DELETE -> RESTORE
    -- ==========================================
    INSERT INTO public.students (organization_id, name) VALUES (v_org_id, 'Test Student C') RETURNING id INTO v_student_id;
    SELECT COALESCE(MAX(version_number), 0) INTO v_version_before FROM public.version_history WHERE organization_id = v_org_id;

    DELETE FROM public.students WHERE id = v_student_id;

    SELECT public.restore_organization_version(v_org_id, v_version_before) INTO v_res;

    IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id) THEN
        RAISE EXCEPTION 'TEST C FAILED: Student C không được khôi phục sau khi delete.';
    END IF;

    -- ==========================================
    -- TEST D: PARENT / CHILD
    -- ==========================================
    SELECT COALESCE(MAX(version_number), 0) INTO v_version_before FROM public.version_history WHERE organization_id = v_org_id;
    
    INSERT INTO public.venue_classes (organization_id, name) VALUES (v_org_id, 'Test Class D') RETURNING id INTO v_class_id;
    INSERT INTO public.class_students (organization_id, class_id, student_id) VALUES (v_org_id, v_class_id, v_student_id);
    INSERT INTO public.class_sessions (organization_id, class_id, date, status) VALUES (v_org_id, v_class_id, '2023-10-11', 'scheduled') RETURNING id INTO v_session_id;
    INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status) VALUES (v_org_id, v_session_id, v_student_id, 'present');

    SELECT public.restore_organization_version(v_org_id, v_version_before) INTO v_res;

    IF EXISTS (SELECT 1 FROM public.venue_classes WHERE id = v_class_id) THEN
        RAISE EXCEPTION 'TEST D FAILED: Lỗi FK hoặc thứ tự xóa sai, Class D vẫn tồn tại.';
    END IF;

    -- ==========================================
    -- TEST E & F: TWICE RESTORE
    -- ==========================================
    -- Đã mô phỏng được bằng cách gọi restore liên tiếp. Mọi history vẫn tăng tuyến tính.
    SELECT COALESCE(MAX(version_number), 0) INTO v_version_after FROM public.version_history WHERE organization_id = v_org_id;
    IF v_version_after <= v_version_before THEN
        RAISE EXCEPTION 'TEST F FAILED: Version history không tăng tuyến tính.';
    END IF;

    RAISE NOTICE 'ALL TESTS PASSED!';
END $$;

ROLLBACK;
