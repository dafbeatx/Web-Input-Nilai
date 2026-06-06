-- ============================================================
-- Migration: Scoping Daily Lessons to Academic Year & Semester
-- ============================================================

-- 1. Add academic_year and semester columns to public.daily_lessons table
ALTER TABLE public.daily_lessons 
ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2025/2026',
ADD COLUMN IF NOT EXISTS semester TEXT NOT NULL DEFAULT 'Ganjil';

-- 2. Create index on academic_year and semester for performance optimization
CREATE INDEX IF NOT EXISTS idx_daily_lessons_year_sem ON public.daily_lessons(academic_year, semester);

-- 3. Confirm RLS policy remains active
-- RLS was already enabled in lessons_schema.sql. This ensures it is robust.
ALTER TABLE public.daily_lessons ENABLE ROW LEVEL SECURITY;
