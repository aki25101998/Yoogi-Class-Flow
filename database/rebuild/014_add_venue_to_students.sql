-- 014_add_venue_to_students.sql

-- Add venue_id to students table to store the base venue when a student is not yet assigned to a class
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;
