-- ==============================================================================
-- NAWASENA PLATFORM SISWA — TABEL CATATAN BIMBINGAN KONSELING (BK)
-- Sekolah: SMP Terpadu Al-Ittihadiyah
-- Sinkronisasi otomatis dari Smart-Absensi-Guru (Dual-Write)
-- Migration: 20261103_counseling_records.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.counseling_records (
    id TEXT PRIMARY KEY DEFAULT ('bk_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_nisn TEXT,
    class_name TEXT NOT NULL,
    counselor_id TEXT NOT NULL,
    counselor_name TEXT NOT NULL,
    counselor_npp TEXT,
    counseling_date DATE NOT NULL DEFAULT CURRENT_DATE,
    counseling_time TEXT,
    counseling_type TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (counseling_type IN (
        'INDIVIDUAL', 'GROUP', 'PARENT_CONFERENCE', 'HOME_VISIT',
        'ACADEMIC_GUIDANCE', 'BEHAVIOR_MEDIATION', 'CAREER_INTEREST'
    )),
    urgency TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH')),
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN (
        'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'MONITORING', 'REFERRED'
    )),
    visibility TEXT NOT NULL DEFAULT 'PUBLIC_STUDENT' CHECK (visibility IN ('PUBLIC_STUDENT', 'CONFIDENTIAL_STAFF')),
    topic TEXT NOT NULL,
    background_narrative TEXT,
    action_taken TEXT NOT NULL,
    student_commitment TEXT,
    parent_involvement TEXT,
    follow_up_plan TEXT,
    follow_up_date DATE,
    academic_year TEXT DEFAULT '2026/2027',
    semester TEXT DEFAULT 'GANJIL' CHECK (semester IN ('GANJIL', 'GENAP')),
    synced_to_nawasena BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indeks pencarian cepat
CREATE INDEX IF NOT EXISTS idx_counseling_records_student_name ON public.counseling_records(student_name);
CREATE INDEX IF NOT EXISTS idx_counseling_records_student_nisn ON public.counseling_records(student_nisn);
CREATE INDEX IF NOT EXISTS idx_counseling_records_class ON public.counseling_records(class_name);
CREATE INDEX IF NOT EXISTS idx_counseling_records_date ON public.counseling_records(counseling_date DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_records_visibility ON public.counseling_records(visibility);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.counseling_records ENABLE ROW LEVEL SECURITY;

-- Policy RLS: Hanya catatan PUBLIC_STUDENT yang boleh dibaca oleh siswa/publik di Nawasena
DROP POLICY IF EXISTS "nawasena_student_read_counseling_policy" ON public.counseling_records;
CREATE POLICY "nawasena_student_read_counseling_policy" ON public.counseling_records
    FOR SELECT
    USING (visibility = 'PUBLIC_STUDENT');

-- Policy RLS: Izinkan insert/update/delete dari API / Anon Key yang disinkronkan oleh guru
DROP POLICY IF EXISTS "nawasena_sync_write_policy" ON public.counseling_records;
CREATE POLICY "nawasena_sync_write_policy" ON public.counseling_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

