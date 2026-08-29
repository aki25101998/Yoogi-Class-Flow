-- 018_multi_workspace_hardening.sql

-- 1. Add last_active_workspace to profiles for safe cookie fallback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_active_workspace'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_active_workspace UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Hardened accept_invitation RPC that prevents overwriting existing roles
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
    v_existing_member RECORD;
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

    -- 8. Check if user is ALREADY a member of THIS organization to prevent overwriting roles
    SELECT * INTO v_existing_member
    FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id AND user_id = v_profile_id;

    IF v_existing_member IS NOT NULL THEN
        IF v_existing_member.status = 'active' THEN
            -- They are already an active member, reject the invitation
            UPDATE public.organization_invitations SET status = 'revoked' WHERE id = invitation_id;
            RETURN json_build_object('success', false, 'error', 'Bạn đã là thành viên của tổ chức này với một vai trò khác. Lời mời đã bị hủy.');
        ELSE
            -- They exist but are suspended/removed, we can reactivate and update role
            UPDATE public.organization_members
            SET role = v_invitation.role,
                status = 'active',
                permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
            WHERE id = v_existing_member.id
            RETURNING id INTO v_member_id;
        END IF;
    ELSE
        -- They are NOT a member, insert new
        INSERT INTO public.organization_members (
            organization_id, user_id, role, status, permissions
        ) VALUES (
            v_invitation.organization_id, v_profile_id, v_invitation.role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
        )
        RETURNING id INTO v_member_id;
    END IF;

    -- 9. Create or update coach safely (Only if they don't already have one, or reactivate)
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

    -- 10. Update last_active_workspace so they seamlessly land in the new org
    UPDATE public.profiles
    SET last_active_workspace = v_invitation.organization_id
    WHERE id = v_profile_id;

    -- 11. Mark invitation as accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = invitation_id;

    RETURN json_build_object('success', true, 'member_id', v_member_id, 'profile_id', v_profile_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$;
