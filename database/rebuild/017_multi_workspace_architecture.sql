-- 017_multi_workspace_architecture.sql
-- Migration script to enforce Multi-Workspace Architecture

-- 1. Sync coach roles and permissions back to organization_members just in case 
-- there are discrepancies before dropping the columns.
UPDATE public.organization_members om
SET 
  role = c.role,
  permissions = c.permissions
FROM public.coaches c
WHERE c.organization_member_id = om.id
  AND c.role IS NOT NULL;

-- 2. Drop the redundant role and permissions columns from coaches
-- The source of truth for Role and Permissions MUST be organization_members.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'coaches' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.coaches DROP COLUMN role;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'coaches' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.coaches DROP COLUMN permissions;
  END IF;
END $$;

-- 3. Ensure uniqueness constraints are in place
-- UNIQUE(organization_id, user_id) on organization_members
-- UNIQUE(organization_member_id) on coaches
-- These were created in earlier migrations, just adding a check here for completeness.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_organization_id_user_id_key'
  ) THEN
    ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE(organization_id, user_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- Ignore if constraint already exists with a different name but same columns
END $$;

-- 4. Update accept_invitation RPC to remove coaches.role and coaches.permissions
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_user_email TEXT;
    v_google_name TEXT;
    v_google_avatar TEXT;
    v_profile_name TEXT;
    v_invitation RECORD;
    v_member_id UUID;
    v_existing_coach RECORD;
BEGIN
    -- 1. Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- 2. Get auth user details as the SOURCE OF TRUTH
    SELECT email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
    INTO v_user_email, v_google_name, v_google_avatar
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy email của tài khoản đăng nhập.');
    END IF;

    -- 3. Get invitation & ROW LOCK to prevent race conditions
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE id = invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy lời mời.');
    END IF;

    -- 4. Check invitation status
    IF v_invitation.status = 'accepted' THEN
        SELECT m.id INTO v_member_id
        FROM public.organization_members m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE p.auth_user_id = v_user_id AND m.organization_id = v_invitation.organization_id;

        IF v_member_id IS NOT NULL THEN
            RETURN json_build_object('success', true, 'member_id', v_member_id, 'message', 'Đã nhận lời mời trước đó.');
        ELSE
            RETURN json_build_object('success', false, 'error', 'Lời mời này đã được sử dụng.');
        END IF;
    END IF;
    
    IF v_invitation.status = 'revoked' THEN
        RETURN json_build_object('success', false, 'error', 'Lời mời đã bị thu hồi.');
    END IF;
    IF v_invitation.status = 'expired' THEN
        RETURN json_build_object('success', false, 'error', 'Lời mời đã hết hạn.');
    END IF;
    IF v_invitation.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Lời mời không hợp lệ.');
    END IF;

    -- 5. Check expiry
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
        UPDATE public.organization_invitations SET status = 'expired' WHERE id = invitation_id;
        RETURN json_build_object('success', false, 'error', 'Lời mời đã hết hạn.');
    END IF;

    -- 6. Check email match
    IF lower(trim(v_invitation.email)) != lower(trim(v_user_email)) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Lời mời này được gửi tới ' || v_invitation.email || '. Vui lòng đăng nhập bằng đúng tài khoản được mời.'
        );
    END IF;

    -- 7. Get or Create profile with ON CONFLICT (Race condition safe)
    INSERT INTO public.profiles (auth_user_id, email, name, avatar_url)
    VALUES (
        v_user_id, 
        v_user_email, 
        COALESCE(v_google_name, split_part(v_user_email, '@', 1)), 
        v_google_avatar
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url)
    RETURNING id, name INTO v_profile_id, v_profile_name;

    -- 8. Get or Create Organization Member safely
    INSERT INTO public.organization_members (
        organization_id, user_id, role, status, permissions
    ) VALUES (
        v_invitation.organization_id, v_profile_id, v_invitation.role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        permissions = EXCLUDED.permissions
    RETURNING id INTO v_member_id;

    -- 9. Create or update coach safely
    IF v_invitation.role IN ('head_coach', 'assistant_coach', 'admin', 'owner') THEN
        SELECT * INTO v_existing_coach
        FROM public.coaches
        WHERE organization_member_id = v_member_id
        LIMIT 1;

        IF v_existing_coach IS NOT NULL THEN
            UPDATE public.coaches
            SET status = 'active'
            WHERE id = v_existing_coach.id;
        ELSE
            INSERT INTO public.coaches (
                organization_id, organization_member_id, status
            ) VALUES (
                v_invitation.organization_id, v_member_id, 'active'
            );
        END IF;
    END IF;

    -- 10. Mark invitation as accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = invitation_id;

    RETURN json_build_object('success', true, 'member_id', v_member_id, 'profile_id', v_profile_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;

