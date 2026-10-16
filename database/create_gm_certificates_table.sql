-- ============================================================
-- Table: gm_certificate_templates
-- Menyimpan template teks sertifikat penghargaan LDKS yang dapat dikustomisasi oleh Admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gm_certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cert_type TEXT NOT NULL DEFAULT 'LDKS' UNIQUE,
    title TEXT NOT NULL DEFAULT 'SERTIFIKAT PENGHARGAAN',
    subtitle TEXT NOT NULL DEFAULT 'Latihan Dasar Kepemimpinan Siswa (LDKS)',
    cert_number_prefix TEXT NOT NULL DEFAULT '042/LDKS-SMATAS/X/2026',
    citation TEXT NOT NULL DEFAULT 'Diberikan dengan penuh hormat dan apresiasi kepada:',
    description TEXT NOT NULL DEFAULT 'Atas partisipasi aktif, dedikasi, serta integritas tinggi dalam mengikuti dan menyelesaikan seluruh rangkaian kegiatan Latihan Dasar Kepemimpinan Siswa (LDKS) sebagai PESERTA.',
    city TEXT NOT NULL DEFAULT 'Bogor',
    issue_date TEXT NOT NULL DEFAULT '',
    signer1_role TEXT NOT NULL DEFAULT 'Ketua Panitia LDKS,',
    signer1_name TEXT NOT NULL DEFAULT 'Ketua Panitia LDKS, S.Pd.',
    signer2_role TEXT NOT NULL DEFAULT 'Kepala Sekolah,',
    signer2_name TEXT NOT NULL DEFAULT 'Farhan Sopian Sahid, S.Pd.I',
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    target_class TEXT NOT NULL DEFAULT 'ALL_X',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_gm_certificate_templates_type ON public.gm_certificate_templates(cert_type);
CREATE INDEX IF NOT EXISTS idx_gm_certificate_templates_published ON public.gm_certificate_templates(is_published);

-- Enable RLS
ALTER TABLE public.gm_certificate_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user dapat membaca template sertifikat
DROP POLICY IF EXISTS "gm_certificate_templates_read" ON public.gm_certificate_templates;
CREATE POLICY "gm_certificate_templates_read" ON public.gm_certificate_templates
    FOR SELECT
    USING (true);

-- Policy: Admin atau service role dapat mengubah data
DROP POLICY IF EXISTS "gm_certificate_templates_write" ON public.gm_certificate_templates;
CREATE POLICY "gm_certificate_templates_write" ON public.gm_certificate_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Data Default Awal untuk Sertifikat LDKS
INSERT INTO public.gm_certificate_templates (
    cert_type,
    title,
    subtitle,
    cert_number_prefix,
    citation,
    description,
    city,
    issue_date,
    signer1_role,
    signer1_name,
    signer2_role,
    signer2_name,
    academic_year,
    target_class,
    is_published
) VALUES (
    'LDKS',
    'SERTIFIKAT PENGHARGAAN',
    'Latihan Dasar Kepemimpinan Siswa (LDKS)',
    '042/LDKS-SMATAS/X/2026',
    'Diberikan dengan penuh hormat dan apresiasi kepada:',
    'Atas partisipasi aktif, dedikasi, serta integritas tinggi dalam mengikuti dan menyelesaikan seluruh rangkaian kegiatan Latihan Dasar Kepemimpinan Siswa (LDKS) sebagai PESERTA.',
    'Bogor',
    '16 Oktober 2026',
    'Ketua Panitia LDKS,',
    'Ketua Panitia LDKS, S.Pd.',
    'Kepala Sekolah,',
    'Farhan Sopian Sahid, S.Pd.I',
    '2026/2027',
    'ALL_X',
    FALSE
) ON CONFLICT (cert_type) DO NOTHING;
