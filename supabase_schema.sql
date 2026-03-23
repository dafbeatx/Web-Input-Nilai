-- TABEL: grade_keys
-- Digunakan untuk menyimpan kunci jawaban GradeMaster dengan proteksi password

CREATE TABLE IF NOT EXISTS public.grade_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    answers JSONB NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.grade_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read/write" ON public.grade_keys;
CREATE POLICY "Allow anonymous read/write" ON public.grade_keys
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- TABEL: grade_sessions
-- Menyimpan sesi koreksi lengkap (kunci jawaban + jawaban siswa + skor essay)

CREATE TABLE IF NOT EXISTS public.grade_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name TEXT NOT NULL,
    password TEXT NOT NULL,
    answer_key JSONB NOT NULL DEFAULT '{}',
    student_answers JSONB NOT NULL DEFAULT '{}',
    essay_scores JSONB NOT NULL DEFAULT '[]',
    total_questions INTEGER NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(session_name)
);

ALTER TABLE public.grade_sessions 
ADD COLUMN IF NOT EXISTS teacher_name TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS class_name TEXT,
ADD COLUMN IF NOT EXISTS school_level TEXT,
ADD COLUMN IF NOT EXISTS student_list JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS graded_students JSONB DEFAULT '[]';

ALTER TABLE public.grade_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous access grade_sessions" ON public.grade_sessions;
CREATE POLICY "Allow anonymous access grade_sessions" ON public.grade_sessions
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
