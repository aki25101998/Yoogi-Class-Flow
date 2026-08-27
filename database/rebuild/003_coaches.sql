-- 003_coaches.sql

CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  -- Note: auth_user_id, email, and name are removed. 
  -- They are derived from profiles via organization_member_id.
  phone TEXT DEFAULT '',
  cccd TEXT DEFAULT '',
  level TEXT DEFAULT '',
  membership_number TEXT DEFAULT '',
  role TEXT DEFAULT 'coach', -- coach, admin, owner
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_member_id)
);
