-- 031_class_coaches_constraints.sql

-- Ensure that each class can only have at most one HEAD_COACH
-- Note: 'HEAD_COACH' role is strictly typed in the codebase, we enforce it to be unique per class.
-- We use upper case based on our types but allow case-insensitivity if needed.
-- Actually the codebase uses both 'head_coach' and 'HEAD_COACH'. Let's drop existing unique constraint on role to be safe, but wait, there isn't one yet.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_unique_head_coach_per_class'
        AND n.nspname = 'public'
    ) THEN
        -- Create partial unique index on class_id for role 'HEAD_COACH' or 'head_coach'
        CREATE UNIQUE INDEX idx_unique_head_coach_per_class 
        ON public.class_coaches (class_id) 
        WHERE UPPER(role) = 'HEAD_COACH';
    END IF;
END $$;
