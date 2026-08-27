-- 012_invitation.sql

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

GRANT EXECUTE ON FUNCTION get_public_invitation(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_invitation(UUID) TO authenticated;

-- Accept Invitation RPC
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    v_role TEXT;
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
        v_role := CASE WHEN v_invitation.role IN ('admin', 'owner') THEN 'admin' ELSE 'coach' END;

        -- We no longer rely on email inside coaches. We rely on organization_member_id.
        SELECT * INTO v_existing_coach
        FROM public.coaches
        WHERE organization_member_id = v_member_id
        LIMIT 1;

        IF v_existing_coach IS NOT NULL THEN
            UPDATE public.coaches
            SET role = v_role,
                status = 'active',
                permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
            WHERE id = v_existing_coach.id;
        ELSE
            INSERT INTO public.coaches (
                organization_id, organization_member_id, role, status, permissions
            ) VALUES (
                v_invitation.organization_id, v_member_id, v_role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
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
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
