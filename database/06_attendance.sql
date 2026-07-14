CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  venue_coach_id UUID REFERENCES public.venue_coaches(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'checked_in',
  approved_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  earnings NUMERIC DEFAULT 0,
  note TEXT DEFAULT '',
  is_substitution BOOLEAN DEFAULT FALSE,
  original_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
