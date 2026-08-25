-- 15_class_coaches.sql
-- Create class_coaches table for assigning multiple coaches to a class

CREATE TABLE IF NOT EXISTS public.class_coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- e.g., 'HEAD_COACH', 'ASSISTANT_COACH'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, coach_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_coaches_organization_id ON public.class_coaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_coaches_class_id ON public.class_coaches(class_id);
CREATE INDEX IF NOT EXISTS idx_class_coaches_coach_id ON public.class_coaches(coach_id);

-- Enable RLS
ALTER TABLE public.class_coaches ENABLE ROW LEVEL SECURITY;
