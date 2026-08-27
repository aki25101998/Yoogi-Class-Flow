-- 005_classes.sql

CREATE TABLE IF NOT EXISTS public.venue_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  start_time TEXT DEFAULT '18:00',
  end_time TEXT DEFAULT '20:00',
  schedule_days JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- e.g., 'head_coach', 'assistant_coach'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, coach_id)
);

CREATE INDEX IF NOT EXISTS idx_class_coaches_organization_id ON public.class_coaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_coaches_class_id ON public.class_coaches(class_id);
CREATE INDEX IF NOT EXISTS idx_class_coaches_coach_id ON public.class_coaches(coach_id);
