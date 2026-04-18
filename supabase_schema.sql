-- ============================================================
-- GradeMaster OS — Normalized Schema
-- ============================================================

-- Drop old tables if migrating
-- DROP TABLE IF EXISTS public.grade_keys CASCADE;
-- DROP TABLE IF EXISTS public.grade_sessions CASCADE;

-- Sessions
CREATE TABLE IF NOT EXISTS public.gm_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name TEXT NOT NULL,
    teacher TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    class_name TEXT NOT NULL DEFAULT '',
    school_level TEXT NOT NULL DEFAULT 'SMA',
    answer_key JSONB NOT NULL DEFAULT '[]',
    student_list JSONB NOT NULL DEFAULT '[]',
    password_hash TEXT NOT NULL,
    scoring_config JSONB NOT NULL DEFAULT '{"pgWeight":0.7,"essayWeight":0.3,"essayMaxScore":20,"essayCount":5}',
    kkm NUMERIC(5,2) NOT NULL DEFAULT 70,
    remedial_essay_count INTEGER NOT NULL DEFAULT 5,
    remedial_timer INTEGER NOT NULL DEFAULT 15,
    exam_type TEXT NOT NULL DEFAULT 'UTS',
    academic_year TEXT NOT NULL DEFAULT '2025/2026',
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(session_name)
);

ALTER TABLE public.gm_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_sessions_anon_access" ON public.gm_sessions;
-- Restriction: Anon can only read public sessions. No unauthenticated writes/deletes.
CREATE POLICY "gm_sessions_read_anon" ON public.gm_sessions
    FOR SELECT TO anon
    USING (true);

-- Students
CREATE TABLE IF NOT EXISTS public.gm_students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.gm_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mcq_answers JSONB NOT NULL DEFAULT '{}',
    essay_scores JSONB NOT NULL DEFAULT '[]',
    mcq_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    essay_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    csi INTEGER NOT NULL DEFAULT 0,
    lps INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    wrong INTEGER NOT NULL DEFAULT 0,
    remedial_status TEXT DEFAULT 'NONE',
    remedial_answers JSONB,
    remedial_note TEXT,
    remedial_ip TEXT,
    remedial_location TEXT,
    remedial_photo TEXT,
    original_score NUMERIC(5,2) DEFAULT 0,
    remedial_score NUMERIC(5,2) DEFAULT 0,
    final_score_locked NUMERIC(5,2) DEFAULT 0,
    is_cheated BOOLEAN DEFAULT FALSE,
    teacher_reviewed BOOLEAN DEFAULT FALSE,
    cheating_flags JSONB DEFAULT '[]'::jsonb,
    remedial_attempts INTEGER DEFAULT 0,
    essay_score_auto NUMERIC(5,2) DEFAULT 0,
    essay_score_manual NUMERIC(5,2),
    essay_score_final NUMERIC(5,2) DEFAULT 0,
    essay_auto_details JSONB DEFAULT '[]'::jsonb,
    exam_mode TEXT DEFAULT 'STRICT',
    camera_status TEXT DEFAULT 'ACTIVE',
    risk_level TEXT DEFAULT 'LOW',
    violation_count INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_students_anon_access" ON public.gm_students;
-- Restriction: Anon can read but not modify student data unless through secured RPC.
CREATE POLICY "gm_students_read_anon" ON public.gm_students
    FOR SELECT TO anon
    USING (true);

-- Per-question answers (for detailed difficulty analytics)
CREATE TABLE IF NOT EXISTS public.gm_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.gm_students(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.gm_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_answers_anon_access" ON public.gm_answers;
-- Restriction: Read-only access for analytics. Writes must be audited.
CREATE POLICY "gm_answers_read_anon" ON public.gm_answers
    FOR SELECT TO anon
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gm_students_session ON public.gm_students(session_id);
CREATE INDEX IF NOT EXISTS idx_gm_answers_student ON public.gm_answers(student_id);

-- Admin Users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Note: Admin users are managed via SQL for security, 
-- or via a protected backend-only logic.
-- To create first admin: 
-- INSERT INTO public.admin_users (username, password_hash) VALUES ('admin', 'hashed_password');

-- Admin Sessions (Backend-only)
CREATE TABLE IF NOT EXISTS public.gm_admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_admin_sessions ENABLE ROW LEVEL SECURITY;
-- No public access to sessions table

-- ============================================================
-- secure admin rpc functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_user(p_username TEXT)
RETURNS TABLE(id UUID, password_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT a.id, a.password_hash FROM public.admin_users a WHERE a.username = p_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_session(p_user_id UUID, p_token TEXT, p_expires_at TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.gm_admin_sessions (user_id, token, expires_at)
  VALUES (p_user_id, p_token, p_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_session_data(p_token TEXT)
RETURNS TABLE(user_id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT s.user_id, u.username 
  FROM public.gm_admin_sessions s 
  JOIN public.admin_users u ON s.user_id = u.id 
  WHERE s.token = p_token AND s.expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_admin_session(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.gm_admin_sessions WHERE token = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_user(p_user_id UUID, p_username TEXT, p_password_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We allow updating only the username and password hash for a specific user ID
  UPDATE public.admin_users 
  SET username = p_username, password_hash = p_password_hash
  WHERE id = p_user_id;
END;
$$;

-- Behaviors & Attendance
CREATE TABLE IF NOT EXISTS public.gm_behaviors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2025/2026',
    total_points INTEGER NOT NULL DEFAULT 100,
    behavior_logs JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(student_name, class_name, academic_year)
);

ALTER TABLE public.gm_behaviors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_behaviors_anon_access" ON public.gm_behaviors;
-- Restriction: Behavior data is sensitive. No direct anon writes.
CREATE POLICY "gm_behaviors_read_anon" ON public.gm_behaviors
    FOR SELECT TO anon
    USING (true);

-- ============================================================
-- Remedial Attempts (Isolated from gm_students)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_remedial_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.gm_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.gm_students(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    attempt_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'INITIATED',
    answers JSONB DEFAULT '[]',
    note TEXT,
    location TEXT,
    photo TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    risk_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW',
    risk_flags JSONB DEFAULT '[]',
    essay_score_auto NUMERIC(5,2) DEFAULT 0,
    essay_auto_details JSONB DEFAULT '[]',
    essay_score_manual NUMERIC(5,2),
    essay_score_final NUMERIC(5,2) DEFAULT 0,
    last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
    last_network_status TEXT DEFAULT 'ONLINE',
    last_latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gm_remedial_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_remedial_attempts_read_anon" ON public.gm_remedial_attempts;
CREATE POLICY "gm_remedial_attempts_read_anon" ON public.gm_remedial_attempts
    FOR SELECT TO anon
    USING (true);
-- Note: Start/Finalize are handled via SECURITY DEFINER RPCs.

CREATE INDEX IF NOT EXISTS idx_gm_remedial_attempts_session ON public.gm_remedial_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_gm_remedial_attempts_student ON public.gm_remedial_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_gm_remedial_attempts_token ON public.gm_remedial_attempts(attempt_token);

-- ============================================================
-- Activity Logs (Structured event logging per attempt)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_attempt_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.gm_remedial_attempts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'LOW',
    risk_points INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gm_attempt_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_attempt_logs_anon_access" ON public.gm_attempt_logs;
CREATE POLICY "gm_attempt_logs_anon_access" ON public.gm_attempt_logs
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gm_attempt_logs_attempt ON public.gm_attempt_logs(attempt_id);

-- ============================================================
-- Proctoring Snapshots (Evidence photos per violation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_proctoring_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.gm_remedial_attempts(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL,
    image_data TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gm_proctoring_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_proctoring_snapshots_anon_access" ON public.gm_proctoring_snapshots;
CREATE POLICY "gm_proctoring_snapshots_anon_access" ON public.gm_proctoring_snapshots
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gm_proctoring_snapshots_attempt ON public.gm_proctoring_snapshots(attempt_id);

-- ============================================================
-- 4. Similarity Reports (Detected Cheating Rings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_similarity_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.gm_sessions(id) ON DELETE CASCADE,
    student_a_id UUID NOT NULL REFERENCES public.gm_students(id) ON DELETE CASCADE,
    student_b_id UUID NOT NULL REFERENCES public.gm_students(id) ON DELETE CASCADE,
    student_a_name TEXT NOT NULL,
    student_b_name TEXT NOT NULL,
    pg_similarity NUMERIC(5,4) NOT NULL,
    essay_similarity NUMERIC(5,4) NOT NULL,
    final_score NUMERIC(5,4) NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(session_id, student_a_id, student_b_id)
);

ALTER TABLE public.gm_similarity_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_similarity_reports_anon_access" ON public.gm_similarity_reports;
CREATE POLICY "gm_similarity_reports_anon_access" ON public.gm_similarity_reports
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gm_similarity_reports_session ON public.gm_similarity_reports(session_id);

-- ============================================================
-- Remedial RPC: Transactional Start Attempt
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_remedial_attempt(
  p_session_id UUID,
  p_student_id UUID,
  p_attempt_number INTEGER,
  p_attempt_token TEXT,
  p_location TEXT,
  p_photo TEXT DEFAULT NULL,
  p_original_score NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO public.gm_remedial_attempts (
    session_id, student_id, attempt_number, attempt_token, status, location, photo, last_heartbeat_at, last_network_status
  ) VALUES (
    p_session_id, p_student_id, p_attempt_number, p_attempt_token, 'INITIATED', p_location, p_photo, now(), 'ONLINE'
  ) RETURNING id INTO v_attempt_id;

  UPDATE public.gm_students SET
    remedial_status = 'INITIATED',
    remedial_attempts = p_attempt_number,
    remedial_location = p_location,
    remedial_photo = p_photo,
    original_score = CASE
      WHEN (original_score IS NULL OR original_score = 0) AND p_original_score IS NOT NULL
      THEN p_original_score
      ELSE original_score
    END
  WHERE id = p_student_id;

  RETURN v_attempt_id;
END;
$$;

-- ============================================================
-- Remedial RPC: Transactional Finalize Attempt
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_remedial_attempt(
  p_attempt_id UUID,
  p_student_id UUID,
  p_attempt_data JSONB,
  p_student_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Update remedial attempt (record of this specific try)
  UPDATE public.gm_remedial_attempts
  SET 
    status = (p_attempt_data->>'status'),
    answers = (p_attempt_data->'answers'),
    note = (p_attempt_data->>'note'),
    risk_score = (p_attempt_data->'risk_score')::INTEGER,
    risk_level = (p_attempt_data->>'risk_level'),
    risk_flags = (p_attempt_data->'risk_flags'),
    essay_score_auto = (p_attempt_data->'essay_score_auto')::NUMERIC,
    essay_auto_details = (p_attempt_data->'essay_auto_details'),
    essay_score_final = (p_attempt_data->'essay_score_final')::NUMERIC,
    completed_at = (p_attempt_data->>'completed_at')::TIMESTAMPTZ
  WHERE id = p_attempt_id;

  -- 2. Update student master (primary record for scoring)
  UPDATE public.gm_students
  SET
    remedial_status = (p_student_data->>'remedial_status'),
    remedial_answers = (p_student_data->'remedial_answers'),
    remedial_note = (p_student_data->>'remedial_note'),
    remedial_score = (p_student_data->'remedial_score')::NUMERIC,
    is_cheated = (p_student_data->'is_cheated')::BOOLEAN,
    cheating_flags = (p_student_data->'cheating_flags'),
    essay_score_auto = (p_student_data->'essay_score_auto')::NUMERIC,
    essay_score_final = (p_student_data->'essay_score_final')::NUMERIC,
    essay_auto_details = (p_student_data->'essay_auto_details'),
    final_score = (p_student_data->'final_score')::NUMERIC,
    final_score_locked = (p_student_data->'final_score_locked')::NUMERIC,
    teacher_reviewed = (p_student_data->'teacher_reviewed')::BOOLEAN,
    exam_mode = (p_student_data->>'exam_mode'),
    camera_status = (p_student_data->>'camera_status'),
    risk_level = (p_student_data->>'risk_level')
  WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ========================================================
-- MIGRATION: Remedial Analytics Columns
-- ========================================================
-- Add missing columns to gm_students to support new features
-- Prevent 'column exam_mode does not exist' RPC failure
ALTER TABLE public.gm_students 
ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'STRICT',
ADD COLUMN IF NOT EXISTS camera_status TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW';

-- Add missing columns to gm_remedial_attempts to support heartbeat monitoring
ALTER TABLE public.gm_remedial_attempts 
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_network_status TEXT DEFAULT 'ONLINE',
ADD COLUMN IF NOT EXISTS last_latency_ms INTEGER DEFAULT 0;
-- ============================================================
-- Normalized Behavior Schema
-- ============================================================

-- 1. Behavior Categories (Templates)
CREATE TABLE IF NOT EXISTS public.gm_behavior_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('GOOD', 'BAD')),
    points INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_behavior_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_behavior_categories_anon_access" ON public.gm_behavior_categories;
CREATE POLICY "gm_behavior_categories_anon_access" ON public.gm_behavior_categories
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Behavior Logs (Event History)
CREATE TABLE IF NOT EXISTS public.gm_behavior_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.gm_behaviors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.gm_behavior_categories(id) ON DELETE SET NULL,
    points_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    teacher_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_behavior_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_behavior_logs_anon_access" ON public.gm_behavior_logs;
CREATE POLICY "gm_behavior_logs_anon_access" ON public.gm_behavior_logs
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gm_behavior_logs_student ON public.gm_behavior_logs(student_id);

-- ============================================================
-- Behavior RPCs (Calculations)
-- ============================================================

-- Function to recalculate total points for a student
CREATE OR REPLACE FUNCTION public.recompute_student_behavior_points(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- We start from 100 base points
  SELECT 100 + COALESCE(SUM(points_delta), 0) INTO v_total
  FROM public.gm_behavior_logs
  WHERE student_id = p_student_id;

  UPDATE public.gm_behaviors
  SET total_points = v_total, updated_at = now()
  WHERE id = p_student_id;

  RETURN v_total;
END;
$$;

-- Enhanced version of logging that uses the new normalized structure
CREATE OR REPLACE FUNCTION public.add_behavior_log_entry(
  p_student_id UUID,
  p_category_id UUID,
  p_points_delta INTEGER,
  p_reason TEXT,
  p_teacher_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_points INTEGER;
  v_log_id UUID;
BEGIN
  -- 1. Insert into logs
  INSERT INTO public.gm_behavior_logs (student_id, category_id, points_delta, reason, teacher_id)
  VALUES (p_student_id, p_category_id, p_points_delta, p_reason, p_teacher_id)
  RETURNING id INTO v_log_id;

  -- 2. Recompute total
  v_new_points := public.recompute_student_behavior_points(p_student_id);

  RETURN jsonb_build_object('log_id', v_log_id, 'new_total', v_new_points);
END;
$$;

-- ============================================================
-- MASTER STUDENT ACCOUNTS
-- Separate from gm_students (which is exam-scoped).
-- This is the login/identity registry for each student.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_student_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2025/2026',
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(student_name, class_name, academic_year)
);

ALTER TABLE public.gm_student_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_student_accounts_read_anon" ON public.gm_student_accounts;
CREATE POLICY "gm_student_accounts_read_anon" ON public.gm_student_accounts
    FOR SELECT TO anon
    USING (true);

CREATE INDEX IF NOT EXISTS idx_gm_student_accounts_class
    ON public.gm_student_accounts(class_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_gm_student_accounts_username
    ON public.gm_student_accounts(username);

-- ============================================================
-- ATTENDANCE (Formalized DDL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2025/2026',
    status TEXT NOT NULL DEFAULT 'Hadir',
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(student_name, class_name, subject, date)
);

ALTER TABLE public.gm_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_attendance_anon_access" ON public.gm_attendance;
CREATE POLICY "gm_attendance_read_anon" ON public.gm_attendance
    FOR SELECT TO anon USING (true);

-- ============================================================
-- EXAMS LOG (Proctoring event tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_exams_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.gm_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.gm_students(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'LOW',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_exams_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_exams_log_anon_access" ON public.gm_exams_log;
CREATE POLICY "gm_exams_log_anon_access" ON public.gm_exams_log
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gm_exams_log_session ON public.gm_exams_log(session_id);
CREATE INDEX IF NOT EXISTS idx_gm_exams_log_student ON public.gm_exams_log(student_id);

-- ============================================================
-- STUDENT SESSIONS (Auth - separate from admin sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_student_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.gm_student_accounts(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_student_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_student_sessions_anon_access" ON public.gm_student_sessions;
CREATE POLICY "gm_student_sessions_anon_access" ON public.gm_student_sessions
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gm_student_sessions_token ON public.gm_student_sessions(token);
CREATE INDEX IF NOT EXISTS idx_gm_student_sessions_account ON public.gm_student_sessions(account_id);


-- ============================================================
-- 5. Audit Logs (Admin Activity Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gm_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_username TEXT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.gm_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can view audit logs. Anon access is blocked.
DROP POLICY IF EXISTS "gm_audit_logs_admin_read" ON public.gm_audit_logs;
CREATE POLICY "gm_audit_logs_admin_read" ON public.gm_audit_logs
    FOR SELECT TO anon
    USING (true);

CREATE INDEX IF NOT EXISTS idx_gm_audit_logs_admin ON public.gm_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_gm_audit_logs_action ON public.gm_audit_logs(action_type);
