-- database/18_public_invitation_rpc.sql

-- Drop the function if it exists to ensure clean replacement
DROP FUNCTION IF EXISTS get_public_invitation(UUID);

-- Create a secure RPC function to fetch limited invitation data
CREATE OR REPLACE FUNCTION get_public_invitation(invitation_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.email,
        i.role,
        i.status,
        i.expires_at,
        o.name AS organization_name
    FROM public.organization_invitations i
    JOIN public.organizations o ON i.organization_id = o.id
    WHERE i.id = invitation_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_public_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_invitation(UUID) TO authenticated;
