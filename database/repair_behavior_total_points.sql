-- ============================================================
-- REPAIR SCRIPT: Recalculate gm_behaviors.total_points
-- from actual gm_behavior_logs entries.
--
-- Root Cause: Siswa diinisialisasi dengan total_points = 100
-- (bukan 0), menyebabkan total poin demerit corrupt.
--
-- Formula: total_points = SUM(points_delta) dari semua log.
-- Jika tidak ada log → total_points = 0
-- ============================================================

-- Step 1: Preview data SEBELUM repair (verifikasi dulu)
SELECT
  b.id,
  b.student_name,
  b.class_name,
  b.total_points AS current_points,
  COALESCE(SUM(l.points_delta), 0) AS correct_points,
  b.total_points - COALESCE(SUM(l.points_delta), 0) AS discrepancy
FROM gm_behaviors b
LEFT JOIN gm_behavior_logs l ON l.student_id = b.id
GROUP BY b.id, b.student_name, b.class_name, b.total_points
HAVING b.total_points != COALESCE(SUM(l.points_delta), 0)
ORDER BY b.class_name, b.student_name;

-- Step 2: Jalankan UPDATE untuk memperbaiki seluruh data
-- PASTIKAN preview di Step 1 sudah diverifikasi sebelum menjalankan ini.
UPDATE gm_behaviors b
SET
  total_points = COALESCE(subq.log_sum, 0),
  updated_at   = NOW()
FROM (
  SELECT
    l.student_id,
    SUM(l.points_delta) AS log_sum
  FROM gm_behavior_logs l
  GROUP BY l.student_id
) AS subq
WHERE b.id = subq.student_id
  AND b.total_points != COALESCE(subq.log_sum, 0);

-- Step 3: Reset siswa yang tidak punya log ke 0
-- (Mereka sebelumnya di-init dengan 100)
UPDATE gm_behaviors
SET total_points = 0, updated_at = NOW()
WHERE id NOT IN (
  SELECT DISTINCT student_id FROM gm_behavior_logs
)
AND total_points != 0;

-- Step 4: Verifikasi hasil — harusnya 0 baris returned
SELECT
  b.student_name,
  b.class_name,
  b.total_points,
  COALESCE(SUM(l.points_delta), 0) AS log_sum
FROM gm_behaviors b
LEFT JOIN gm_behavior_logs l ON l.student_id = b.id
GROUP BY b.id, b.student_name, b.class_name, b.total_points
HAVING b.total_points != COALESCE(SUM(l.points_delta), 0);
