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
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
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

