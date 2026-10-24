-- 034_venue_image_url.sql
-- Add image_url to venues table for visual identification of training locations / dojos

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
