-- Migration: Add auth_user_id to coaches and map existing users

-- 1. Add column if it does not exist
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- 2. Populate auth_user_id based on email for backward compatibility
UPDATE public.coaches c
SET auth_user_id = u.id
FROM auth.users u
WHERE c.email = u.email AND c.auth_user_id IS NULL;

-- Note: We do not enforce NOT NULL on auth_user_id yet to allow gradual migration,
-- but it should be heavily relied upon for RLS.
