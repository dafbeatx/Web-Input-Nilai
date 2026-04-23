-- ========================================================================
-- FIX RLS: Izinkan akses SELECT untuk role 'authenticated'
-- ========================================================================
-- Masalah: Sebelumnya kebijakan RLS (Row Level Security) hanya mengizinkan 
-- role 'anon' untuk melakukan SELECT. Ketika siswa login menggunakan Google 
-- SSO, peran mereka menjadi 'authenticated', sehingga diblokir oleh RLS 
-- dan tidak bisa melihat data apapun (termasuk daftar sesi dan hasil nilai).
-- ========================================================================

BEGIN;

-- 1. gm_sessions
DROP POLICY IF EXISTS "gm_sessions_read_authenticated" ON public.gm_sessions;
CREATE POLICY "gm_sessions_read_authenticated" ON public.gm_sessions
    FOR SELECT TO authenticated
    USING (true);

-- 2. gm_students
DROP POLICY IF EXISTS "gm_students_read_authenticated" ON public.gm_students;
CREATE POLICY "gm_students_read_authenticated" ON public.gm_students
    FOR SELECT TO authenticated
    USING (true);

-- 3. gm_student_accounts
DROP POLICY IF EXISTS "gm_student_accounts_read_authenticated" ON public.gm_student_accounts;
CREATE POLICY "gm_student_accounts_read_authenticated" ON public.gm_student_accounts
    FOR SELECT TO authenticated
    USING (true);

-- 4. gm_behaviors
DROP POLICY IF EXISTS "gm_behaviors_read_authenticated" ON public.gm_behaviors;
CREATE POLICY "gm_behaviors_read_authenticated" ON public.gm_behaviors
    FOR SELECT TO authenticated
    USING (true);

-- 5. gm_attendance
DROP POLICY IF EXISTS "gm_attendance_read_authenticated" ON public.gm_attendance;
CREATE POLICY "gm_attendance_read_authenticated" ON public.gm_attendance
    FOR SELECT TO authenticated
    USING (true);

-- 6. gm_answers
DROP POLICY IF EXISTS "gm_answers_read_authenticated" ON public.gm_answers;
CREATE POLICY "gm_answers_read_authenticated" ON public.gm_answers
    FOR SELECT TO authenticated
    USING (true);

-- 7. gm_remedial_attempts
DROP POLICY IF EXISTS "gm_remedial_attempts_read_authenticated" ON public.gm_remedial_attempts;
CREATE POLICY "gm_remedial_attempts_read_authenticated" ON public.gm_remedial_attempts
    FOR SELECT TO authenticated
    USING (true);

-- 8. gm_student_sessions
DROP POLICY IF EXISTS "gm_student_sessions_read_authenticated" ON public.gm_student_sessions;
CREATE POLICY "gm_student_sessions_read_authenticated" ON public.gm_student_sessions
    FOR SELECT TO authenticated
    USING (true);

-- 9. gm_behavior_categories
DROP POLICY IF EXISTS "gm_behavior_categories_read_authenticated" ON public.gm_behavior_categories;
CREATE POLICY "gm_behavior_categories_read_authenticated" ON public.gm_behavior_categories
    FOR SELECT TO authenticated
    USING (true);

-- 10. gm_behavior_logs
DROP POLICY IF EXISTS "gm_behavior_logs_read_authenticated" ON public.gm_behavior_logs;
CREATE POLICY "gm_behavior_logs_read_authenticated" ON public.gm_behavior_logs
    FOR SELECT TO authenticated
    USING (true);

COMMIT;
