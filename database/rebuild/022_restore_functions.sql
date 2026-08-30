-- 022_restore_functions.sql

-- Helper to dynamically build UPDATE statement from jsonb
CREATE OR REPLACE FUNCTION public.build_dynamic_update(p_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_cols TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name) || ' = p.' || quote_ident(column_name), ', ')
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = p_table 
      -- SECURITY: Immutable fields that should never be updated via dynamic restore
      AND column_name NOT IN ('id', 'organization_id', 'created_at', 'created_by');
    
    -- SECURITY: Must include organization_id = $3 to guarantee boundary isolation
    RETURN 'UPDATE public.' || quote_ident(p_table) || ' t SET ' || v_cols || 
           ' FROM jsonb_populate_record(null::public.' || quote_ident(p_table) || ', $1) p WHERE t.id = $2 AND t.organization_id = $3';
END;
$$;

-- 1. Full Organization Restore
CREATE OR REPLACE FUNCTION public.restore_organization_version(
    p_org_id UUID,
    p_target_version_number BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_change RECORD;
    v_restore_version_id UUID;
    v_profile_id UUID;
BEGIN
    -- 1. Check Permissions
    IF NOT public.is_org_admin(p_org_id) THEN
        RETURN json_build_object('success', false, 'error', 'Only Admin or Owner can restore.');
    END IF;

    -- 2. Verify target version exists
    IF NOT EXISTS (SELECT 1 FROM public.version_history WHERE organization_id = p_org_id AND version_number = p_target_version_number) THEN
        RETURN json_build_object('success', false, 'error', 'Version does not exist.');
    END IF;

    -- 3. Get profile id
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

    -- 4. Create the RESTORE version history manually
    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        'Khôi phục dữ liệu toàn bộ tổ chức về phiên bản ' || p_target_version_number,
        'RESTORE',
        v_profile_id
    ) RETURNING id INTO v_restore_version_id;

    -- Set the context so triggers use this version
    PERFORM set_config('app.current_version_id', v_restore_version_id::text, true);

    -- 5. Apply inverse operations in reverse chronological order
    FOR v_change IN 
        SELECT vc.* 
        FROM public.version_changes vc
        JOIN public.version_history vh ON vh.id = vc.version_id
        WHERE vh.organization_id = p_org_id 
          AND vh.version_number > p_target_version_number
        ORDER BY vh.version_number DESC, vc.sequence_id DESC
    LOOP
        BEGIN
            IF v_change.operation = 'INSERT' THEN
                -- Inverse is DELETE
                -- SECURITY: Append organization_id condition
                EXECUTE format('DELETE FROM public.%I WHERE id = %L AND organization_id = %L', v_change.table_name, v_change.record_id, p_org_id);
            ELSIF v_change.operation = 'DELETE' THEN
                -- Inverse is INSERT
                -- SECURITY: Force override organization_id in the payload
                EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)', v_change.table_name, v_change.table_name) 
                USING v_change.before_data || jsonb_build_object('organization_id', p_org_id);
            ELSIF v_change.operation = 'UPDATE' THEN
                -- Inverse is UPDATE with before_data
                EXECUTE public.build_dynamic_update(v_change.table_name) USING v_change.before_data, v_change.record_id, p_org_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- In a real scenario, foreign key violations during partial inverse might occur if 
            -- schema is complex, but since we are reversing exact chronological events, 
            -- it should perfectly rewind the state atomically.
            RAISE EXCEPTION 'Lỗi khi khôi phục bảng % (Record %): %', v_change.table_name, v_change.record_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN json_build_object('success', true, 'new_version_id', v_restore_version_id);
END;
$$;


-- 2. Partial Record Restore
CREATE OR REPLACE FUNCTION public.restore_record_to_state(
    p_org_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_state JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restore_version_id UUID;
    v_profile_id UUID;
    v_exists BOOLEAN;
    v_current_org_id UUID;
BEGIN
    -- 1. Check Permissions
    IF NOT public.is_org_admin(p_org_id) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied.');
    END IF;

    -- 2. SECURITY: Table Whitelist (Prevent targeting arbitrary tables)
    IF p_table_name NOT IN (
        'venues', 'venue_classes', 'class_coaches', 'students', 'class_students', 
        'schedules', 'attendance', 'student_session_attendance', 'teacher_salaries', 
        'tuition', 'finance_transactions', 'class_sessions'
    ) THEN
        RAISE EXCEPTION 'Bảng % không được phép khôi phục.', p_table_name;
    END IF;

    -- 3. SECURITY: Validate payload organization_id
    IF (p_state->>'organization_id')::UUID != p_org_id THEN
        RAISE EXCEPTION 'Dữ liệu không thuộc về Organization hiện tại. Không thể khôi phục.';
    END IF;

    -- 4. Get profile
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

    -- 5. Create RESTORE version context
    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        'Khôi phục bản ghi (' || p_table_name || ')',
        'RESTORE',
        v_profile_id
    ) RETURNING id INTO v_restore_version_id;

    PERFORM set_config('app.current_version_id', v_restore_version_id::text, true);

    -- 6. SECURITY: Check current record if exists
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = %L', p_table_name, p_record_id) INTO v_current_org_id;
    
    v_exists := v_current_org_id IS NOT NULL;

    BEGIN
        IF v_exists THEN
            -- SECURITY: Validate current record ownership
            IF v_current_org_id != p_org_id THEN
                RAISE EXCEPTION 'Bản ghi hiện tại thuộc về Organization khác. Không thể ghi đè.';
            END IF;
            -- Update
            EXECUTE public.build_dynamic_update(p_table_name) USING p_state, p_record_id, p_org_id;
        ELSE
            -- Insert
            -- SECURITY: Force override organization_id just in case
            EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)', p_table_name, p_table_name) 
            USING p_state || jsonb_build_object('organization_id', p_org_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Lỗi khi khôi phục record: %', SQLERRM;
    END;

    RETURN json_build_object('success', true, 'new_version_id', v_restore_version_id);
END;
$$;
