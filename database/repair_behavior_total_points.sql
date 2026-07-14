-- ============================================================
-- REPAIR SCRIPT: Recalculate gm_behaviors.total_points
-- from actual gm_behavior_logs entries.
--
-- Root Cause: Siswa diinisialisasi dengan total_points = 100
-- (bukan 0), menyebabkan poin demerit corrupt (+100 phantom).
--
-- AMAN: Siswa yang punya log pelanggaran → dihitung dari log asli.
--       Siswa tanpa log apapun       → di-set ke 0.
--       Tidak ada data pelanggaran yang dihapus atau direset.
-- ============================================================

-- Step 1: PREVIEW — Lihat data yang akan diperbaiki (tanpa mengubah apapun)
SELECT
  b.student_name,
  b.class_name,
  b.total_points                        AS poin_sekarang,
  COALESCE(SUM(l.points_delta), 0)      AS poin_seharusnya,
  COUNT(l.id)                           AS jumlah_log_pelanggaran
FROM gm_behaviors b
LEFT JOIN gm_behavior_logs l ON l.student_id = b.id
GROUP BY b.id, b.student_name, b.class_name, b.total_points
HAVING b.total_points != COALESCE(SUM(l.points_delta), 0)
ORDER BY b.class_name, b.student_name;

-- ──────────────────────────────────────────────────────────────
-- Step 2: REPAIR — Satu query tunggal yang aman.
--
-- Logika:
--   • Jika siswa punya log pelanggaran → total = SUM(log.points_delta)
--     Contoh: Gilang punya 1 log +5 → total_points = 5  (bukan 105)
--   • Jika siswa tidak punya log sama sekali → total = 0
--     (siswa bersih, phantom 100 dihapus)
--
-- Siswa dengan log pelanggaran TIDAK direset ke 0.
-- ──────────────────────────────────────────────────────────────
UPDATE gm_behaviors b
SET
  total_points = COALESCE(log_sum.actual_total, 0),
  updated_at   = NOW()
FROM (
  SELECT
    b2.id                              AS behavior_id,
    COALESCE(SUM(l.points_delta), 0)   AS actual_total
  FROM gm_behaviors b2
  LEFT JOIN gm_behavior_logs l ON l.student_id = b2.id
  GROUP BY b2.id
) AS log_sum
WHERE b.id = log_sum.behavior_id
  AND b.total_points != log_sum.actual_total;

-- Step 3: VERIFY — Harus mengembalikan 0 baris jika repair berhasil
SELECT
  b.student_name,
  b.class_name,
  b.total_points                   AS poin_sekarang,
  COALESCE(SUM(l.points_delta), 0) AS poin_dari_log
FROM gm_behaviors b
LEFT JOIN gm_behavior_logs l ON l.student_id = b.id
GROUP BY b.id, b.student_name, b.class_name, b.total_points
HAVING b.total_points != COALESCE(SUM(l.points_delta), 0);

