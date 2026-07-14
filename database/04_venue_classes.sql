CREATE TABLE IF NOT EXISTS public.venue_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  start_time TEXT DEFAULT '18:00',
  end_time TEXT DEFAULT '20:00',
  schedule_days JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
