-- 019_version_history.sql

CREATE TABLE IF NOT EXISTS public.organization_version_counters (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    current_version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.version_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    version_number BIGINT NOT NULL,
    summary TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'SYSTEM')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(organization_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.version_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.version_history(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_history_org ON public.version_history(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_changes_version ON public.version_changes(version_id);
CREATE INDEX IF NOT EXISTS idx_version_changes_record ON public.version_changes(record_id, table_name);

-- Helper to safely get next version for an org
CREATE OR REPLACE FUNCTION public.get_next_organization_version(p_org_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_version BIGINT;
BEGIN
    INSERT INTO public.organization_version_counters (organization_id, current_version)
    VALUES (p_org_id, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET current_version = public.organization_version_counters.current_version + 1,
        updated_at = NOW()
    RETURNING current_version INTO v_next_version;
    
    RETURN v_next_version;
END;
$$;
