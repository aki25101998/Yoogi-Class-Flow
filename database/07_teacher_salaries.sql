CREATE TABLE IF NOT EXISTS public.teacher_salaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  per_session NUMERIC DEFAULT 0,
  per_student NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
