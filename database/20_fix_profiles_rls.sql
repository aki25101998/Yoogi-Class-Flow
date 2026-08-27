-- Migration: Fix Profiles RLS for Organization Members
-- Allows members of the same organization to view each other's profiles

-- Drop any conflicting policies if they exist (safe measure)
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON public.profiles;

-- Add policy to allow organization members to read profiles of other members in their org
CREATE POLICY "Users can view profiles in their organizations" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.user_id = profiles.id
    AND organization_members.organization_id IN (SELECT public.get_user_organizations())
  )
);
