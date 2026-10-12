-- ============================================================================
-- TABEL: gm_oral_exams (GradeMaster OS - Penilaian Ujian Lisan)
-- Sekolah: SMP Terpadu Al-Ittihadiyah
-- Template 1: BTQ & Hafalan (Tahfidz)
-- Template 2: Bahasa Inggris & Bahasa Arab (15 Butir Checklist Lisan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gm_oral_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,                     -- ID unik sesi pengujian lisan
    template_type TEXT NOT NULL CHECK (template_type IN ('BTQ_HAFALAN', 'BAHASA_INGGRIS_ARAB')),
    title TEXT NOT NULL,                          -- Judul sesi ujian
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    examiner_name TEXT NOT NULL,                  -- Nama guru penguji
    room_number TEXT DEFAULT 'Ruang 01',          -- Ruang ujian
    class_name TEXT NOT NULL,                     -- '7', '8A', '8B', '9A', '9B', '10', '11', '12' (Kelas 7 tunggal)
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Identitas Siswa
    student_id TEXT NOT NULL,                     -- ID Siswa / User ID
    student_name TEXT NOT NULL,
    nisn TEXT,
    
    -- Nilai & Predikat Template 1 (BTQ & Hafalan)
    btq_score NUMERIC(5, 2) DEFAULT NULL,
    btq_predicate CHAR(1) DEFAULT NULL,
    hafalan_score NUMERIC(5, 2) DEFAULT NULL,
    hafalan_predicate CHAR(1) DEFAULT NULL,
    
    -- Nilai & Checklist Template 2 (Bahasa Inggris & Bahasa Arab - 15 Butir)
    english_checklist BOOLEAN[] DEFAULT NULL,
    english_correct_count INT DEFAULT 0,
    english_score NUMERIC(5, 2) DEFAULT NULL,
    english_predicate CHAR(1) DEFAULT NULL,
    
    arabic_checklist BOOLEAN[] DEFAULT NULL,
    arabic_correct_count INT DEFAULT 0,
    arabic_score NUMERIC(5, 2) DEFAULT NULL,
    arabic_predicate CHAR(1) DEFAULT NULL,
    
    notes TEXT,                                   -- Catatan / umpan balik penguji
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gm_oral_exams_session_student_key UNIQUE (session_id, student_id)
);

-- Index Performa
CREATE INDEX IF NOT EXISTS idx_gm_oral_exams_class_year ON public.gm_oral_exams (class_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_gm_oral_exams_student ON public.gm_oral_exams (student_id);
CREATE INDEX IF NOT EXISTS idx_gm_oral_exams_session ON public.gm_oral_exams (session_id);

-- Row Level Security (RLS)
ALTER TABLE public.gm_oral_exams ENABLE ROW LEVEL SECURITY;

-- 1. Guru & Admin: Kelola Penuh
DROP POLICY IF EXISTS "Guru dan Admin dapat mengelola ujian lisan" ON public.gm_oral_exams;
CREATE POLICY "Guru dan Admin dapat mengelola ujian lisan"
    ON public.gm_oral_exams
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Siswa & Orang Tua: Read-Only
DROP POLICY IF EXISTS "Siswa dan Orang Tua dapat melihat nilai ujian lisan" ON public.gm_oral_exams;
CREATE POLICY "Siswa dan Orang Tua dapat melihat nilai ujian lisan"
    ON public.gm_oral_exams
    FOR SELECT
    TO anon, authenticated
    USING (true);
