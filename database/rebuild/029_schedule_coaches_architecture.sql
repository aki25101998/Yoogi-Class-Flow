-- 029_schedule_coaches_architecture.sql

-- 1. Create schedule_coaches table
CREATE TABLE IF NOT EXISTS public.schedule_coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'HEAD_COACH',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schedule_id, coach_id) -- Prevent duplicate coach assignments to the same schedule
);

-- 2. Create session_coaches table
CREATE TABLE IF NOT EXISTS public.session_coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'checked_in' CHECK (status IN ('scheduled', 'checked_in', 'absent', 'excused')),
    is_substitute BOOLEAN DEFAULT FALSE,
    calculated_salary NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, coach_id) -- Prevent duplicate coach assignments to the same session
);

-- 3. Add effective_from and effective_until to schedules
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS effective_from DATE,
ADD COLUMN IF NOT EXISTS effective_until DATE;

-- 4. Add UNIQUE constraint to class_sessions to prevent double-click / race conditions
-- We only add this if it doesn't already exist.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'class_sessions_unique_schedule_date'
    ) THEN
        ALTER TABLE public.class_sessions 
        ADD CONSTRAINT class_sessions_unique_schedule_date UNIQUE (organization_id, schedule_id, date);
    END IF;
END $$;

-- 5. Data Migration: schedules.coach_id -> schedule_coaches
-- Only insert if the schedule_id + coach_id combination doesn't already exist
INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id)
SELECT organization_id, id, coach_id
FROM public.schedules
WHERE coach_id IS NOT NULL
ON CONFLICT (schedule_id, coach_id) DO NOTHING;

-- 6. Data Migration: class_sessions.coach_id -> session_coaches
-- Only insert if the session_id + coach_id combination doesn't already exist
INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status)
SELECT organization_id, id, coach_id, status
FROM public.class_sessions
WHERE coach_id IS NOT NULL
ON CONFLICT (session_id, coach_id) DO NOTHING;

-- Verification Queries (For Manual Inspection)
/*
-- 1. Check for schedules without schedule_coaches (expecting 0 if all were migrated)
SELECT s.id, s.coach_id 
FROM public.schedules s
LEFT JOIN public.schedule_coaches sc ON s.id = sc.schedule_id
WHERE sc.id IS NULL AND s.coach_id IS NOT NULL;

-- 2. Check for sessions without session_coaches (expecting 0 if all were migrated)
SELECT cs.id, cs.coach_id
FROM public.class_sessions cs
LEFT JOIN public.session_coaches sc ON cs.id = sc.session_id
WHERE sc.id IS NULL AND cs.coach_id IS NOT NULL;

-- 3. Verify data matches
SELECT 
    s.id as schedule_id, 
    s.coach_id as old_coach_id, 
    sc.coach_id as new_coach_id
FROM public.schedules s
JOIN public.schedule_coaches sc ON s.id = sc.schedule_id
WHERE s.coach_id != sc.coach_id;
*/
