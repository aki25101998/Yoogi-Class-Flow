-- Migration: Secure RPC for accepting organization invitations
-- Function runs as SECURITY DEFINER to bypass RLS internally
-- It strictly verifies auth.uid(), email match, and invitation validity before mutating database

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
    v_profile_name TEXT;
    v_invitation RECORD;
    v_member_id UUID;
    v_existing_member_id UUID;
    v_existing_coach RECORD;
    v_role TEXT;
BEGIN
    -- 1. Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- 2. Get profile
    SELECT id, email, name INTO v_profile_id, v_user_email, v_profile_name
    FROM public.profiles
    WHERE auth_user_id = v_user_id
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- 3. Get invitation
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE id = invitation_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy lời mời.');
    END IF;

    -- 4. Check invitation status
    IF v_invitation.status = 'accepted' THEN
        RETURN json_build_object('success', false, 'error', 'Lời mời này đã được sử dụng.');
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

    -- 7. Check if already a member
    SELECT id INTO v_existing_member_id
    FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id
      AND user_id = v_profile_id
      AND status = 'active'
    LIMIT 1;

    IF v_existing_member_id IS NOT NULL THEN
        v_member_id := v_existing_member_id;
    ELSE
        -- Insert organization_members
        INSERT INTO public.organization_members (
            organization_id, user_id, role, status, permissions
        ) VALUES (
            v_invitation.organization_id, v_profile_id, v_invitation.role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
        ) RETURNING id INTO v_member_id;
    END IF;

    -- 8. Create or link coach if role requires
    IF v_invitation.role IN ('head_coach', 'assistant_coach', 'admin', 'owner') THEN
        -- Check if coach already exists for this email
        SELECT * INTO v_existing_coach
        FROM public.coaches
        WHERE lower(trim(email)) = lower(trim(v_user_email))
        LIMIT 1;

        v_role := CASE WHEN v_invitation.role IN ('admin', 'owner') THEN 'admin' ELSE 'coach' END;

        IF v_existing_coach IS NOT NULL THEN
            -- Link existing coach if safe
            IF v_existing_coach.organization_id IS NULL OR v_existing_coach.organization_id = v_invitation.organization_id THEN
                UPDATE public.coaches
                SET organization_id = v_invitation.organization_id,
                    organization_member_id = v_member_id,
                    role = v_role,
                    permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
                WHERE id = v_existing_coach.id;
            ELSE
                -- Coach belongs to another org, create a new one
                INSERT INTO public.coaches (
                    organization_id, organization_member_id, email, name, role, status, permissions
                ) VALUES (
                    v_invitation.organization_id, v_member_id, v_user_email, v_profile_name, v_role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
                );
            END IF;
        ELSE
            -- Create new coach
            INSERT INTO public.coaches (
                organization_id, organization_member_id, email, name, role, status, permissions
            ) VALUES (
                v_invitation.organization_id, v_member_id, v_user_email, v_profile_name, v_role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
            );
        END IF;
    END IF;

    -- 9. Mark invitation as accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = invitation_id;

    RETURN json_build_object('success', true);
END;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
