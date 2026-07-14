-- ══════════════════════════════════════════════════════════════
-- 🚨 EMERGENCY FIX: Split "ASAJ B. INGGRIS" → 9A + 9B
-- ══════════════════════════════════════════════════════════════
-- 
-- INSTRUKSI:
-- 1. Buka https://supabase.com/dashboard/project/fwhdjqvtjzesbdcqorsn/sql
-- 2. Copy-paste SELURUH isi file ini
-- 3. Klik RUN
-- 4. Pastikan output: "COMMIT" tanpa error
--
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Repurpose sesi kosong "ASAJ INFORMATIKA KELAS 9"
--         → "ASAJ B. INGGRIS KELAS 9A"
-- ═══════════════════════════════════════════════════════════

-- Copy settings from source "ASAJ B. INGGRIS" [9B]
UPDATE public.gm_sessions
SET
  session_name = 'ASAJ B. INGGRIS KELAS 9A',
  class_name = '9A',
  teacher = src.teacher,
  subject = src.subject,
  answer_key = src.answer_key,
  student_list = src.student_list,
  scoring_config = src.scoring_config,
  kkm = src.kkm,
  remedial_essay_count = src.remedial_essay_count,
  remedial_timer = src.remedial_timer,
  exam_type = src.exam_type,
  is_public = src.is_public,
  updated_at = now()
FROM (
  SELECT teacher, subject, answer_key, student_list, scoring_config,
         kkm, remedial_essay_count, remedial_timer, exam_type, is_public
  FROM public.gm_sessions
  WHERE id = '4a9c3a37-3d96-45ec-a51e-57f805b7ff35'
) AS src
WHERE public.gm_sessions.id = '311098f9-ba47-4239-9d3c-e8cdfe8eedad';

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Move 19 siswa 9A ke sesi baru
-- ═══════════════════════════════════════════════════════════

UPDATE public.gm_students
SET session_id = '311098f9-ba47-4239-9d3c-e8cdfe8eedad'
WHERE session_id = '4a9c3a37-3d96-45ec-a51e-57f805b7ff35'
  AND name IN (
    'LIDYA PUTRI JAELANI',
    'SITI NURLAELATUL ALIYAH',
    'LIVIA HAURA HASNA',
    'APRILLA QISTI',
    'AZKIA AJIMA HUMMAIRA',
    'MUTIARA AULIA ANDINI',
    'BUNGA MAISYI MAULIHATUNNISA',
    'CITRA AULIA',
    'KEYSA KANAYA PUTRI',
    'DEA ANANDA MAULIDA',
    'NAFISAH ADE LESTARI',
    'ADZKIYA MAULIDA SUDRAJAT',
    'SEPTIANA AULIA',
    'QUEENESA SABANIAH HARYANI',
    'VIRGIA ASYAVIAN REGINA',
    'KEISYA ADELIA PUTRI',
    'SYAHNA NAJWAH NURAHIMAT',
    'SITI NURASIAH',
    'SITI NURAMINAH'
  );

-- ═══════════════════════════════════════════════════════════
-- STEP 3: Fix gm_behaviors — "ASAJ B.INGGRIS KELAS 9A" → "9A"
-- ═══════════════════════════════════════════════════════════

UPDATE public.gm_behaviors
SET class_name = '9A'
WHERE class_name = 'ASAJ B.INGGRIS KELAS 9A';

-- ═══════════════════════════════════════════════════════════
-- STEP 4: Revert KELPIN & ZIDAN → "9B" (migrasi pertama salah)
-- ═══════════════════════════════════════════════════════════

UPDATE public.gm_behaviors
SET class_name = '9B'
WHERE student_name IN ('KELPIN ALPIANDI', 'MUHAMAD HADATUL ZIDAN')
  AND class_name = '9A';

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- VERIFIKASI (jalankan setelah COMMIT berhasil)
-- ═══════════════════════════════════════════════════════════

-- Cek sesi baru:
SELECT s.session_name, s.class_name, s.subject, s.teacher, count(st.id) as siswa
FROM gm_sessions s
LEFT JOIN gm_students st ON st.session_id = s.id
WHERE s.id IN (
  '4a9c3a37-3d96-45ec-a51e-57f805b7ff35',
  '311098f9-ba47-4239-9d3c-e8cdfe8eedad'
)
GROUP BY s.id, s.session_name, s.class_name, s.subject, s.teacher;

-- Cek behaviors:
SELECT class_name, count(*) 
FROM gm_behaviors 
WHERE class_name IN ('9A', '9B', 'ASAJ B.INGGRIS KELAS 9A')
GROUP BY class_name
ORDER BY class_name;
