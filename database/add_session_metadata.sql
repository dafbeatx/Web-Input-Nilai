-- SQL Migration for public.gm_student_sessions
-- Run this script in the Supabase SQL Editor to add metadata to student sessions.

ALTER TABLE public.gm_student_sessions 
ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT 'unknown';
