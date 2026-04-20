-- ============================================================
-- SQL PATCH: Fix Behavior System Synchronization
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Fix the RPC to use Base 0 (Incorrently was Base 100)
CREATE OR REPLACE FUNCTION public.recompute_student_behavior_points(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- We now start from 0 points (infraction counting system)
  SELECT COALESCE(SUM(points_delta), 0) INTO v_total
  FROM public.gm_behavior_logs
  WHERE student_id = p_student_id;

  UPDATE public.gm_behaviors
  SET total_points = v_total, updated_at = now()
  WHERE id = p_student_id;

  RETURN v_total;
END;
$$;

-- 2. Add Missing UPDATE Policy for gm_behaviors (Allows server actions to sync scores)
DROP POLICY IF EXISTS "gm_behaviors_update_admin" ON public.gm_behaviors;
CREATE POLICY "gm_behaviors_update_admin" ON public.gm_behaviors
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. One-time Global Sync: Recalculate points for EVERY student in the system
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN SELECT id FROM public.gm_behaviors LOOP
        PERFORM public.recompute_student_behavior_points(r.id);
    END LOOP;
END $$;
