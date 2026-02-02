-- Add map_url column to venues table
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS map_url TEXT;
