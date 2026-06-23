-- GRADEMASTER OS - LESSON MANAGEMENT SCHEMA
-- Execute this in Supabase SQL Editor

-- 1. Daily Lessons Table
CREATE TABLE IF NOT EXISTS daily_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES auth.users(id), -- Optional depending on auth setup
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    content TEXT, -- Original input from teacher
    ai_reading_preview TEXT, -- AI summarized preview
    ai_chat_prompt TEXT, -- Prompt used for student chat
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Materials Table
CREATE TABLE IF NOT EXISTS ai_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES daily_lessons(id) ON DELETE CASCADE,
    title TEXT,
    file_url TEXT,
    content_type TEXT, -- 'pdf', 'image', 'text'
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quizzes Table (ASTS, ASAJ, Daily)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES daily_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    quiz_type TEXT CHECK (quiz_type IN ('DAILY', 'ASTS', 'ASAJ')),
    duration_minutes INTEGER DEFAULT 15,
    questions JSONB NOT NULL, -- Array of {question, options, correctAnswer, type: 'mcq'|'essay'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Student Scores & Progress
CREATE TABLE IF NOT EXISTS student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL, -- Link to student profile / auth
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES daily_lessons(id) ON DELETE CASCADE,
    score DECIMAL(5,2) DEFAULT 0,
    answers JSONB, -- Student answers
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS POLICIES (Example for Admin & Public/Student)
ALTER TABLE daily_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin full access daily_lessons" ON daily_lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access ai_materials" ON ai_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access quizzes" ON quizzes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access student_scores" ON student_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Students can read published lessons and quizzes
CREATE POLICY "Student read published lessons" ON daily_lessons FOR SELECT TO public USING (is_published = true);
CREATE POLICY "Student read quizzes" ON quizzes FOR SELECT TO public USING (true);
CREATE POLICY "Student manage own scores" ON student_scores FOR ALL TO public USING (true); -- Refine with student_id check if auth is strict

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_lessons_class ON daily_lessons(class_name);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON daily_lessons(date);
CREATE INDEX IF NOT EXISTS idx_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_quiz ON student_scores(quiz_id);
