-- 032_coach_nickname.sql

-- Add nickname column to coaches table for "tên gợi nhớ"
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT '';
