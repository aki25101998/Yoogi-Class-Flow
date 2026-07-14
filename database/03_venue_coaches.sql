CREATE TABLE IF NOT EXISTS public.venue_coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  rate_type TEXT DEFAULT 'per_session',
  rate NUMERIC DEFAULT 0,
  schedule_days JSONB DEFAULT '[]'::jsonb,
  start_time TEXT DEFAULT '18:00',
  end_time TEXT DEFAULT '20:00',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
