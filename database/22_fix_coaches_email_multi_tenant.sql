-- Migration: Fix coaches email uniqueness for multi-tenant and update RPC
-- Description: Drops the global unique constraint on email and adds an organization-scoped one.
-- Also updates the accept_invitation RPC to handle duplicate emails across organizations gracefully.

DO $$
DECLARE
    dup_group RECORD;
    c RECORD;
    v_keep_id UUID;
    v_conflict_count INTEGER;
BEGIN
    FOR dup_group IN (
        SELECT organization_id, lower(trim(email)) AS normalized_email
        FROM public.coaches
        WHERE email IS NOT NULL
        GROUP BY organization_id, lower(trim(email))
        HAVING COUNT(*) > 1
    ) LOOP
        -- For each duplicate group in the SAME organization, try to resolve safely.
        v_keep_id := NULL;
        v_conflict_count := 0;
        
        FOR c IN (
            SELECT id, organization_member_id,
                   (EXISTS (SELECT 1 FROM public.class_coaches WHERE coach_id = coaches.id)) as has_class,
                   (EXISTS (SELECT 1 FROM public.attendance WHERE coach_id = coaches.id)) as has_attendance,
                   (EXISTS (SELECT 1 FROM public.teacher_salaries WHERE coach_id = coaches.id)) as has_salary,
                   (EXISTS (SELECT 1 FROM public.teacher_salary_sessions WHERE coach_id = coaches.id)) as has_salary_sessions
            FROM public.coaches
            WHERE organization_id = dup_group.organization_id
              AND lower(trim(email)) = dup_group.normalized_email
        ) LOOP
            IF c.organization_member_id IS NOT NULL OR c.has_class OR c.has_attendance OR c.has_salary OR c.has_salary_sessions THEN
                v_conflict_count := v_conflict_count + 1;
                v_keep_id := c.id;
            END IF;
        END LOOP;
        
        IF v_conflict_count > 1 THEN
            RAISE EXCEPTION 'DUPLICATE_DATA_FOUND: Cannot safely resolve duplicate coach email % for organization % because multiple records have related data.', dup_group.normalized_email, dup_group.organization_id;
        END IF;
        
        IF v_keep_id IS NULL THEN
            -- None have relations, keep the first one based on creation date
            SELECT id INTO v_keep_id
            FROM public.coaches
            WHERE organization_id = dup_group.organization_id
              AND lower(trim(email)) = dup_group.normalized_email
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;
        
        -- Delete the safe-to-delete duplicates
        DELETE FROM public.coaches
        WHERE organization_id = dup_group.organization_id
          AND lower(trim(email)) = dup_group.normalized_email
          AND id != v_keep_id;
          
    END LOOP;
END;
$$;

-- 1. Drop the global unique constraint on email
ALTER TABLE public.coaches
DROP CONSTRAINT IF EXISTS coaches_email_key;

-- 2. Create the unique index per organization
CREATE UNIQUE INDEX IF NOT EXISTS coaches_organization_email_key
ON public.coaches (organization_id, lower(trim(email)));

-- 3. Update the accept_invitation RPC
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
    v_existing_member_id UUID;
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

    -- 3. Get invitation
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE id = invitation_id;

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

    -- 8. Check if already a member
    SELECT id INTO v_existing_member_id
    FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id
      AND user_id = v_profile_id
    LIMIT 1;

    IF v_existing_member_id IS NOT NULL THEN
        -- If existing member, just use their member ID
        v_member_id := v_existing_member_id;
        
        -- Optionally update role if the invitation gives higher privileges
        UPDATE public.organization_members
        SET role = v_invitation.role,
            status = 'active',
            permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
        WHERE id = v_existing_member_id;
    ELSE
        -- Insert organization_members
        INSERT INTO public.organization_members (
            organization_id, user_id, role, status, permissions
        ) VALUES (
            v_invitation.organization_id, v_profile_id, v_invitation.role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
        ) RETURNING id INTO v_member_id;
    END IF;

    -- 9. Create or update coach if role requires
    IF v_invitation.role IN ('head_coach', 'assistant_coach', 'admin', 'owner') THEN
        v_role := CASE WHEN v_invitation.role IN ('admin', 'owner') THEN 'admin' ELSE 'coach' END;

        -- Check if coach already exists for this org and member
        SELECT * INTO v_existing_coach
        FROM public.coaches
        WHERE organization_id = v_invitation.organization_id
          AND organization_member_id = v_member_id
        LIMIT 1;

        IF v_existing_coach IS NOT NULL THEN
            UPDATE public.coaches
            SET email = v_user_email,
                name = v_profile_name,
                role = v_role,
                status = 'active',
                permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
            WHERE id = v_existing_coach.id;
        ELSE
            -- Try to find if the coach is existing in this org by email but missing member_id
            SELECT * INTO v_existing_coach
            FROM public.coaches
            WHERE organization_id = v_invitation.organization_id
              AND lower(trim(email)) = lower(trim(v_user_email))
            LIMIT 1;
            
            IF v_existing_coach IS NOT NULL THEN
                UPDATE public.coaches
                SET organization_member_id = v_member_id,
                    name = v_profile_name,
                    role = v_role,
                    status = 'active',
                    permissions = COALESCE(v_invitation.permissions, '[]'::jsonb)
                WHERE id = v_existing_coach.id;
            ELSE
                -- Insert a new coach
                INSERT INTO public.coaches (
                    organization_id, organization_member_id, email, name, role, status, permissions
                ) VALUES (
                    v_invitation.organization_id, v_member_id, v_user_email, v_profile_name, v_role, 'active', COALESCE(v_invitation.permissions, '[]'::jsonb)
                );
            END IF;
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

-- Permissions
REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
