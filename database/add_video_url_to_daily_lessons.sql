-- Migration: Add video_url to daily_lessons for YouTube learning video support
ALTER TABLE public.daily_lessons 
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.daily_lessons.video_url IS 'URL of YouTube learning video embedded in the LMS lesson module';

