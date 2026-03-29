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
CREATE POLICY "gm_sessions_anon_access" ON public.gm_sessions
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

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
CREATE POLICY "gm_students_anon_access" ON public.gm_students
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

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
CREATE POLICY "gm_answers_anon_access" ON public.gm_answers
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

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
CREATE POLICY "gm_behaviors_anon_access" ON public.gm_behaviors
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

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
DROP POLICY IF EXISTS "gm_remedial_attempts_anon_access" ON public.gm_remedial_attempts;
CREATE POLICY "gm_remedial_attempts_anon_access" ON public.gm_remedial_attempts
    FOR ALL TO anon
    USING (true) WITH CHECK (true);

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
