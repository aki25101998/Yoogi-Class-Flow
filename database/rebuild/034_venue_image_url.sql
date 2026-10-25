-- 034_venue_image_url.sql
-- Add image_url and image_position to venues table for visual identification and positioning of training locations

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT '50% 50%';

-- Refresh Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
