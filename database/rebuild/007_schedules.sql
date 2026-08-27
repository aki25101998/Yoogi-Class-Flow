-- 007_schedules.sql

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID,
  venue_id UUID,
  class_id UUID,
  day_of_week INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  rate_type TEXT DEFAULT 'per_session',
  rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, coach_id) REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, venue_id) REFERENCES public.venues(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, class_id) REFERENCES public.venue_classes(organization_id, id) ON DELETE CASCADE,
  UNIQUE(organization_id, id)
);
