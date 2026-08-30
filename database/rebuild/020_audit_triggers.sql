-- 020_audit_triggers.sql

-- Generic trigger function to capture changes
CREATE OR REPLACE FUNCTION public.capture_version_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_profile_id UUID;
    v_version_id UUID;
    v_action_type TEXT;
    v_operation TEXT;
    v_record_id UUID;
    v_before_data JSONB;
    v_after_data JSONB;
BEGIN
    -- Only capture for business operations, ignore if disabled
    IF current_setting('app.disable_audit', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 1. Identify Organization ID and Record ID
    IF TG_OP = 'INSERT' THEN
        v_org_id := NEW.organization_id;
        v_record_id := NEW.id;
        v_operation := 'INSERT';
        v_before_data := NULL;
        v_after_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_org_id := NEW.organization_id;
        v_record_id := NEW.id;
        v_operation := 'UPDATE';
        v_before_data := to_jsonb(OLD);
        v_after_data := to_jsonb(NEW);
        
        -- Ignore if data didn't change
        IF v_before_data = v_after_data THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_org_id := OLD.organization_id;
        v_record_id := OLD.id;
        v_operation := 'DELETE';
        v_before_data := to_jsonb(OLD);
        v_after_data := NULL;
    END IF;

    -- Security Validation: Organization ID is MANDATORY
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Audit failed: Missing organization_id on record %', v_record_id;
    END IF;

    -- 2. Identify User
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = v_user_id LIMIT 1;
    END IF;

    -- 3. Check for existing version context in this transaction
    BEGIN
        v_version_id := current_setting('app.current_version_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_version_id := NULL;
    END;

    -- 4. If no context, create a new version history (Auto-Grouping for single REST calls)
    IF v_version_id IS NULL THEN
        -- Get custom summary if provided via headers
        DECLARE
            v_summary TEXT;
        BEGIN
            v_summary := current_setting('request.headers', true)::jsonb->>'x-version-summary';
        EXCEPTION WHEN OTHERS THEN
            v_summary := NULL;
        END;

        IF v_summary IS NULL THEN
            v_summary := 'Thực hiện thao tác ' || v_operation || ' trên ' || TG_TABLE_NAME;
        END IF;
        
        -- Determine action type based on operation if not explicitly set
        v_action_type := v_operation;
        IF v_action_type = 'INSERT' THEN v_action_type := 'CREATE'; END IF;

        INSERT INTO public.version_history (
            organization_id, version_number, summary, action_type, created_by
        ) VALUES (
            v_org_id, 
            public.get_next_organization_version(v_org_id),
            v_summary,
            v_action_type,
            v_profile_id
        ) RETURNING id INTO v_version_id;

        -- Save to transaction context so subsequent triggers in the same tx reuse it
        PERFORM set_config('app.current_version_id', v_version_id::text, true);
    END IF;

    -- 5. Record the change
    INSERT INTO public.version_changes (
        organization_id, version_id, table_name, record_id, operation, before_data, after_data
    ) VALUES (
        v_org_id, v_version_id, TG_TABLE_NAME, v_record_id, v_operation, v_before_data, v_after_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply triggers to business tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'venues', 'venue_classes', 'class_coaches', 'students', 'class_students', 
            'schedules', 'attendance', 'student_session_attendance', 'teacher_salaries', 
            'tuition', 'finance_transactions', 'class_sessions'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON public.%I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_version_history()', t);
    END LOOP;
END $$;
