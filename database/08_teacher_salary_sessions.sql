CREATE TABLE IF NOT EXISTS public.teacher_salary_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.venue_classes(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'checked_in',
  calculated_salary NUMERIC DEFAULT 0,
  salary_config_snapshot JSONB,
  approved_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
