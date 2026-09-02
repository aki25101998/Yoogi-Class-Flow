-- 030_fix_null_statuses.sql
-- Fix NULL values in status columns across all tables and harden constraints

-- 1. Venues
DO $$
BEGIN
  -- Update NULL or invalid statuses to 'active'
  UPDATE public.venues 
  SET status = 'active' 
  WHERE status IS NULL OR status NOT IN ('active', 'inactive');
  
  -- Set NOT NULL to prevent future NULLs
  ALTER TABLE public.venues ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating venues: %', SQLERRM;
END $$;

-- 2. Venue Classes
DO $$
BEGIN
  -- Update NULL or invalid statuses to 'active'
  UPDATE public.venue_classes 
  SET status = 'active' 
  WHERE status IS NULL OR status NOT IN ('active', 'inactive');
  
  -- Set NOT NULL
  ALTER TABLE public.venue_classes ALTER COLUMN status SET NOT NULL;
  
  -- Add missing CHECK constraint
  BEGIN
    ALTER TABLE public.venue_classes ADD CONSTRAINT chk_venue_classes_status CHECK (status IN ('active', 'inactive'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating venue_classes: %', SQLERRM;
END $$;

-- 3. Students
DO $$
BEGIN
  UPDATE public.students 
  SET status = 'active' 
  WHERE status IS NULL OR status NOT IN ('active', 'inactive');
  
  ALTER TABLE public.students ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating students: %', SQLERRM;
END $$;

-- 4. Coaches
DO $$
BEGIN
  UPDATE public.coaches 
  SET status = 'active' 
  WHERE status IS NULL OR status NOT IN ('active', 'inactive');
  
  ALTER TABLE public.coaches ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating coaches: %', SQLERRM;
END $$;

-- 5. Class Students
DO $$
BEGIN
  UPDATE public.class_students 
  SET status = 'active' 
  WHERE status IS NULL OR status NOT IN ('active', 'dropped');
  
  ALTER TABLE public.class_students ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating class_students: %', SQLERRM;
END $$;

-- 6. Tuition
DO $$
BEGIN
  UPDATE public.tuition 
  SET status = 'unpaid' 
  WHERE status IS NULL OR status NOT IN ('unpaid', 'partial', 'paid');
  
  ALTER TABLE public.tuition ALTER COLUMN status SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating tuition: %', SQLERRM;
END $$;
