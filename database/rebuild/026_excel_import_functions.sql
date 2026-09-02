-- 026_excel_import_functions.sql

-- 1. Thêm các cột phụ trợ cho Excel Import
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS dob TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS note TEXT;

-- Index để tìm trùng lặp nhanh hơn
CREATE UNIQUE INDEX IF NOT EXISTS students_ext_id_idx ON public.students (organization_id, external_id) WHERE external_id IS NOT NULL AND external_id != '';
CREATE UNIQUE INDEX IF NOT EXISTS coaches_ext_id_idx ON public.coaches (organization_id, external_id) WHERE external_id IS NOT NULL AND external_id != '';
CREATE UNIQUE INDEX IF NOT EXISTS venues_ext_id_idx ON public.venues (organization_id, external_id) WHERE external_id IS NOT NULL AND external_id != '';


-- 2. Hàm Import Students Batch
CREATE OR REPLACE FUNCTION public.import_students_batch(
    p_org_id UUID,
    p_students JSONB,
    p_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_version_id UUID;
    v_student JSONB;
    v_venue_id UUID;
    v_success_count INT := 0;
    v_error_count INT := 0;
BEGIN
    -- Xác thực
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Kiểm tra quyền admin/owner (đơn giản hóa bằng cách check membership)
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE p.auth_user_id = v_user_id AND m.organization_id = p_org_id AND m.role IN ('admin', 'owner')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = v_user_id LIMIT 1;

    -- Tạo version history entry
    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        COALESCE(p_summary, 'Nhập danh sách học viên từ Excel'),
        'IMPORT',
        v_profile_id
    ) RETURNING id INTO v_version_id;

    -- Lưu transaction context
    PERFORM set_config('app.current_version_id', v_version_id::text, true);

    -- Lặp qua từng học viên và insert
    FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
    LOOP
        BEGIN
            -- Resolve venue_id from venue_name
            v_venue_id := NULL;
            IF v_student->>'venue_name' IS NOT NULL AND (v_student->>'venue_name') != '' THEN
                SELECT id INTO v_venue_id FROM public.venues 
                WHERE organization_id = p_org_id AND name ILIKE (v_student->>'venue_name') LIMIT 1;
                
                IF v_venue_id IS NULL THEN
                    RAISE EXCEPTION 'Không tìm thấy địa điểm học: %', v_student->>'venue_name';
                END IF;
            ELSE
                RAISE EXCEPTION 'Địa điểm học không được để trống.';
            END IF;

            -- Validate required dob
            IF v_student->>'dob' IS NULL OR (v_student->>'dob') = '' THEN
                RAISE EXCEPTION 'Ngày sinh không được để trống đối với học viên: %', COALESCE(v_student->>'name', 'Không xác định');
            END IF;

            INSERT INTO public.students (
                organization_id,
                name,
                phone,
                parent_name,
                parent_phone,
                dob,
                email,
                gender,
                address,
                note,
                external_id,
                venue_id
            ) VALUES (
                p_org_id,
                v_student->>'name',
                v_student->>'phone',
                v_student->>'parent_name',
                v_student->>'parent_phone',
                v_student->>'dob',
                v_student->>'email',
                v_student->>'gender',
                v_student->>'address',
                v_student->>'note',
                v_student->>'external_id',
                v_venue_id
            );
            v_success_count := v_success_count + 1;
        EXCEPTION WHEN unique_violation THEN
            -- Có thể xử lý logic skip/update ở đây, nhưng theo yêu cầu atomic batch, 
            -- ta sẽ quăng lỗi để rollback toàn bộ transaction nếu không skip.
            RAISE EXCEPTION 'Trùng lặp dữ liệu: %', v_student->>'name';
        END;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_success_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 3. Hàm Import Venues Batch
CREATE OR REPLACE FUNCTION public.import_venues_batch(
    p_org_id UUID,
    p_venues JSONB,
    p_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_version_id UUID;
    v_venue JSONB;
    v_success_count INT := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE p.auth_user_id = v_user_id AND m.organization_id = p_org_id AND m.role IN ('admin', 'owner')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = v_user_id LIMIT 1;

    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        COALESCE(p_summary, 'Nhập danh sách địa điểm từ Excel'),
        'IMPORT',
        v_profile_id
    ) RETURNING id INTO v_version_id;

    PERFORM set_config('app.current_version_id', v_version_id::text, true);

    FOR v_venue IN SELECT * FROM jsonb_array_elements(p_venues)
    LOOP
        INSERT INTO public.venues (
            organization_id,
            name,
            address,
            note,
            external_id
        ) VALUES (
            p_org_id,
            v_venue->>'name',
            v_venue->>'address',
            v_venue->>'note',
            v_venue->>'external_id'
        );
        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_success_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 4. Hàm Import Coaches Batch
-- Logic: Tạo ghost profile (auth_user_id = null) -> Tạo organization_member -> Tạo coach
CREATE OR REPLACE FUNCTION public.import_coaches_batch(
    p_org_id UUID,
    p_coaches JSONB,
    p_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_admin_profile_id UUID;
    v_version_id UUID;
    v_coach JSONB;
    v_success_count INT := 0;
    
    v_new_profile_id UUID;
    v_new_member_id UUID;
    v_email TEXT;
    v_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE p.auth_user_id = v_user_id AND m.organization_id = p_org_id AND m.role IN ('admin', 'owner')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT id INTO v_admin_profile_id FROM public.profiles WHERE auth_user_id = v_user_id LIMIT 1;

    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        COALESCE(p_summary, 'Nhập danh sách HLV từ Excel'),
        'IMPORT',
        v_admin_profile_id
    ) RETURNING id INTO v_version_id;

    PERFORM set_config('app.current_version_id', v_version_id::text, true);

    FOR v_coach IN SELECT * FROM jsonb_array_elements(p_coaches)
    LOOP
        v_email := COALESCE(v_coach->>'email', 'no-email-' || gen_random_uuid()::text || '@yoogi.invalid');
        v_name := COALESCE(v_coach->>'name', 'Unknown');
        
        -- Kiểm tra xem email này đã có profile chưa
        SELECT id INTO v_new_profile_id FROM public.profiles WHERE lower(trim(email)) = lower(trim(v_email)) LIMIT 1;
        
        IF v_new_profile_id IS NULL THEN
            -- Tạo ghost profile
            INSERT INTO public.profiles (email, name)
            VALUES (v_email, v_name)
            RETURNING id INTO v_new_profile_id;
        END IF;

        -- Tạo member
        SELECT id INTO v_new_member_id FROM public.organization_members 
        WHERE organization_id = p_org_id AND user_id = v_new_profile_id LIMIT 1;

        IF v_new_member_id IS NULL THEN
            INSERT INTO public.organization_members (
                organization_id, user_id, role, status
            ) VALUES (
                p_org_id, v_new_profile_id, 'coach', 'active'
            ) RETURNING id INTO v_new_member_id;
        END IF;

        -- Tạo coach record
        INSERT INTO public.coaches (
            organization_id,
            organization_member_id,
            role,
            phone,
            cccd,
            level,
            membership_number,
            dob,
            gender,
            address,
            note,
            external_id
        ) VALUES (
            p_org_id,
            v_new_member_id,
            'coach',
            v_coach->>'phone',
            v_coach->>'cccd',
            v_coach->>'level',
            v_coach->>'membership_number',
            v_coach->>'dob',
            v_coach->>'gender',
            v_coach->>'address',
            v_coach->>'note',
            v_coach->>'external_id'
        );
        
        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_success_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
