-- 021_version_history_rls.sql

-- Enable RLS
ALTER TABLE public.organization_version_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_changes ENABLE ROW LEVEL SECURITY;

-- 1. organization_version_counters
-- No policies. Frontend should NEVER access this directly.

-- 2. version_history
DROP POLICY IF EXISTS "Users can view version history in their org" ON public.version_history;
CREATE POLICY "Users can view version history in their org" ON public.version_history 
FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 3. version_changes
DROP POLICY IF EXISTS "Users can view version changes in their org" ON public.version_changes;
CREATE POLICY "Users can view version changes in their org" ON public.version_changes 
FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- Note: No INSERT, UPDATE, DELETE policies for these tables.
-- They are only modified via SECURITY DEFINER functions and triggers which bypass RLS implicitly.
