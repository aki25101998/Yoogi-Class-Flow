-- 043_organization_roles.sql
-- Migration: Create organization_roles table for customizable roles and permissions per organization

CREATE TABLE IF NOT EXISTS public.organization_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  base_role TEXT NOT NULL CHECK (base_role IN ('owner', 'admin', 'head_coach', 'assistant_coach')),
  description TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Index for fast lookup by organization
CREATE INDEX IF NOT EXISTS idx_organization_roles_org_id ON public.organization_roles(organization_id);

-- Enable Row Level Security
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view roles of their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_roles' AND policyname = 'organization_roles_select_policy'
  ) THEN
    CREATE POLICY organization_roles_select_policy ON public.organization_roles
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
          AND status = 'active'
        )
      );
  END IF;
END $$;

-- Policy: Admins and Owners can manage roles of their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_roles' AND policyname = 'organization_roles_all_policy'
  ) THEN
    CREATE POLICY organization_roles_all_policy ON public.organization_roles
      FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
          AND role IN ('owner', 'admin')
          AND status = 'active'
        )
      );
  END IF;
END $$;

