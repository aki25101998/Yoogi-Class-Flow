-- Chuyển đổi format permissions từ object rỗng sang array rỗng
ALTER TABLE public.coaches ALTER COLUMN permissions SET DEFAULT '[]'::jsonb;

-- Convert existing '{}' to '[]'
UPDATE public.coaches 
SET permissions = '[]'::jsonb 
WHERE permissions = '{}'::jsonb;
