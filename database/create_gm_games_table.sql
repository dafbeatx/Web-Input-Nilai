-- Table definition for GradeMaster Educational Game Questions
CREATE TABLE IF NOT EXISTS public.gm_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type TEXT NOT NULL DEFAULT 'chess',
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings ['A', 'B', 'C', 'D']
    correct_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT 'Sedang', -- 'Mudah', 'Sedang', 'Sulit'
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries by game_type and subject
CREATE INDEX IF NOT EXISTS idx_gm_game_questions_subject ON public.gm_game_questions (subject);
CREATE INDEX IF NOT EXISTS idx_gm_game_questions_game_type ON public.gm_game_questions (game_type);

-- Enable RLS
ALTER TABLE public.gm_game_questions ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated read access so students can load questions
CREATE POLICY "Allow public read game questions"
    ON public.gm_game_questions
    FOR SELECT
    USING (true);

-- Allow authenticated or service role write access
CREATE POLICY "Allow write game questions for all users"
    ON public.gm_game_questions
    FOR ALL
    USING (true)
    WITH CHECK (true);
