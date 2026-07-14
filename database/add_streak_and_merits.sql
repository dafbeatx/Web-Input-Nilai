-- =========================================================================
-- GradeMaster OS - Add Study Streak tracking to Student Accounts
-- =========================================================================

-- Alter gm_student_accounts to support streak tracking
ALTER TABLE public.gm_student_accounts 
ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT NULL;

-- Enable RLS permissions for SELECT on gm_student_accounts for authenticated roles
-- (already done in main schema, but re-insuring here)
DROP POLICY IF EXISTS "gm_student_accounts_read_authenticated" ON public.gm_student_accounts;
CREATE POLICY "gm_student_accounts_read_authenticated" ON public.gm_student_accounts
    FOR SELECT TO authenticated
    USING (true);
