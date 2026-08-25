-- 1. Create Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID, -- Will be linked to profiles later
  subscription_plan TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trial',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id), -- Can be NULL for legacy coaches that never logged in
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update organizations owner_id foreign key
ALTER TABLE public.organizations ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES public.profiles(id);

-- 3. Create Organization Members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. Create Organization Invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Modify existing business tables to add organization_id
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS organization_member_id UUID REFERENCES public.organization_members(id) ON DELETE CASCADE;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.venue_classes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.venue_coaches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.teacher_salaries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.teacher_salary_sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.student_attendance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. Data Migration Script
DO $$
DECLARE
    legacy_org_id UUID;
    coach_record RECORD;
    profile_id UUID;
    member_id UUID;
BEGIN
    -- Only run migration if there are coaches without organization_id
    IF EXISTS (SELECT 1 FROM public.coaches WHERE organization_id IS NULL) THEN
        
        -- Get or create Legacy Organization
        SELECT id INTO legacy_org_id FROM public.organizations WHERE slug = 'legacy-org' LIMIT 1;
        
        IF legacy_org_id IS NULL THEN
            INSERT INTO public.organizations (name, slug) 
            VALUES ('Legacy Organization', 'legacy-org')
            RETURNING id INTO legacy_org_id;
        END IF;

        -- Loop through all coaches that don't have an organization yet
        FOR coach_record IN SELECT * FROM public.coaches WHERE organization_id IS NULL LOOP
            
            -- Check if profile already exists for this email
            SELECT id INTO profile_id FROM public.profiles WHERE email = coach_record.email LIMIT 1;
            
            IF profile_id IS NULL THEN
                -- Insert profile
                INSERT INTO public.profiles (auth_user_id, email, name, avatar_url)
                VALUES (coach_record.auth_user_id, coach_record.email, coach_record.name, coach_record.photo_url)
                RETURNING id INTO profile_id;
            ELSE
                -- Update profile auth_user_id if it's missing but we have it now
                IF coach_record.auth_user_id IS NOT NULL THEN
                    UPDATE public.profiles SET auth_user_id = coach_record.auth_user_id WHERE id = profile_id;
                END IF;
            END IF;

            -- Check if member exists
            SELECT id INTO member_id FROM public.organization_members 
            WHERE organization_id = legacy_org_id AND user_id = profile_id LIMIT 1;

            IF member_id IS NULL THEN
                -- Insert organization member
                INSERT INTO public.organization_members (organization_id, user_id, role, status, permissions)
                VALUES (legacy_org_id, profile_id, coach_record.role, coach_record.status, coach_record.permissions)
                RETURNING id INTO member_id;
            END IF;

            -- Update coach record
            UPDATE public.coaches 
            SET organization_id = legacy_org_id, 
                organization_member_id = member_id
            WHERE id = coach_record.id;
            
            -- If this coach was an admin, make them the owner of the organization if it doesn't have one
            IF coach_record.role = 'admin' THEN
                UPDATE public.organizations 
                SET owner_id = profile_id 
                WHERE id = legacy_org_id AND owner_id IS NULL;
            END IF;
            
        END LOOP;

        -- Populate organization_id for other business tables
        UPDATE public.venues SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.venue_classes SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.venue_coaches SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.schedules SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.attendance SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.teacher_salaries SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.teacher_salary_sessions SET organization_id = legacy_org_id WHERE organization_id IS NULL;
        UPDATE public.student_attendance SET organization_id = legacy_org_id WHERE organization_id IS NULL;

    END IF;
END $$;
