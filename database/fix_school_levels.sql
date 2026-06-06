-- ============================================================
-- GradeMaster OS — Database Clean Up: Correcting School Levels
-- ============================================================

-- Update historical gm_sessions records where class starts with 7, 8, or 9 to be SMP
UPDATE public.gm_sessions 
SET school_level = 'SMP' 
WHERE class_name ~ '^[789]';

-- Verify the update
SELECT id, session_name, class_name, school_level 
FROM public.gm_sessions 
WHERE class_name ~ '^[789]';
