-- 023_optimistic_concurrency.sql

-- Generic function for Optimistic Concurrency Update
CREATE OR REPLACE FUNCTION public.safe_update_record(
    p_table_name TEXT,
    p_record_id UUID,
    p_expected_updated_at TIMESTAMPTZ,
    p_new_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_updated_at TIMESTAMPTZ;
    v_exists BOOLEAN;
BEGIN
    -- 1. Prevent SQL Injection
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_table_name) THEN
        RETURN json_build_object('success', false, 'error', 'Bảng không hợp lệ.');
    END IF;

    -- 2. Lock the row to prevent race conditions during the check
    EXECUTE format('SELECT updated_at FROM public.%I WHERE id = %L FOR UPDATE', p_table_name, p_record_id) INTO v_current_updated_at;

    IF v_current_updated_at IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bản ghi không tồn tại hoặc đã bị xóa.');
    END IF;

    -- 3. Check for concurrency collision
    -- PostgreSQL timestamps might have microsecond differences, so we check equality precisely, 
    -- but usually, the frontend stringifies it. It's safer to compare as text if passing from JS, 
    -- or just rely on TIMESTAMPTZ comparison.
    IF v_current_updated_at != p_expected_updated_at THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Dữ liệu này đã được người khác cập nhật. Vui lòng tải lại trước khi lưu.',
            'code', 'CONCURRENT_UPDATE_DETECTED',
            'current_updated_at', v_current_updated_at
        );
    END IF;

    -- 4. Update the record
    -- The update statement will fire the audit trigger!
    BEGIN
        -- Inject the new updated_at into the payload so it updates properly
        p_new_data := p_new_data || jsonb_build_object('updated_at', NOW());
        
        EXECUTE public.build_dynamic_update(p_table_name) USING p_new_data, p_record_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN json_build_object('success', true);
END;
$$;
