Perbaiki sinkronisasi UI #student_profile dengan backend.

File utama:
1. src/components/grademaster/StudentProfileLayer.tsx
2. src/components/GradeMaster.tsx
3. src/app/api/grademaster/students/summary/route.ts
4. Jika perlu, src/app/api/student/check/route.ts dan src/app/api/student/link-google/route.ts

Jangan ubah bagian yang tidak terkait.

Masalah yang perlu diperbaiki:

1. StudentProfileLayer saat ini menerima academicYear dari state global GradeMaster, bukan dari studentData.academic_year.
   - Di GradeMaster.tsx, saat render StudentProfileLayer untuk siswa, gunakan academicYear yang paling akurat:
     studentData.academic_year ?? academicYear.
   - Pastikan profil siswa setelah kenaikan kelas memakai tahun ajaran akun siswa, bukan tahun global lama.

2. Endpoint /api/grademaster/students/summary saat ini mengambil academic history berdasarkan nama siswa saja.
   - Tambahkan parameter className dari UI.
   - Query summary harus filter berdasarkan:
     student name + class name + academic year.
   - Jangan hanya .eq('name', targetStudentName), karena siswa dengan nama sama di kelas berbeda bisa tercampur.
   - Jika className tidak tersedia, fallback boleh tetap nama saja, tetapi beri perlakuan aman.

3. StudentProfileLayer mengambil attendanceLogs langsung dari Supabase client hanya berdasarkan student_name.
   - Ubah agar attendance logs difilter minimal dengan:
     student_name + academic_year.
   - Jika tabel attendance punya class_name, filter juga dengan className.
   - Lebih baik buat endpoint backend khusus untuk attendance logs agar security dan filter konsisten dengan summary.

4. Sinkronkan logika remedial di StudentProfileLayer.
   - Jangan hitung pendingRemedials hanya dari !g.isPassing.
   - Gunakan kombinasi:
     g.isPassing
     g.remedialStatus
     g.hasRemedialAvailable
     g.cheatingFlags
     g.remedialScore
     g.remedialDeadline
   - Buat helper seperti:
     getRemedialUiState(grade)
   - State yang perlu dibedakan:
     a. PASSING
     b. NEEDS_REMEDIAL
     c. REMEDIAL_AVAILABLE
     d. REMEDIAL_ACTIVE
     e. REMEDIAL_SUBMITTED_HELD_BACK
     f. REMEDIAL_SUBMITTED_BELOW_KKM
     g. FAILED_EFFORT
     h. TIME_UP
     i. CHEATED
     j. DEADLINE_PASSED

5. Untuk kasus nilai remedial ditahan:
   - Jika cheatingFlags berisi "Nilai remedial ditahan", jangan tampilkan sebagai "Ujian Belum Tuntas" biasa.
   - Tampilkan banner khusus:
     "Jawaban remedial sudah dikumpulkan. Nilai final masih ditahan sementara sampai teman sekelas selesai atau sampai batas waktu."
   - Jika remedialScore ada, tampilkan sebagai "Nilai remedial sementara".
   - Tampilkan final score lama sebagai "Nilai final sementara", bukan "hasil remedial gagal".

6. Perbaiki tombol "Mulai Remedial".
   - Tombol hanya boleh muncul jika remedial benar-benar bisa dimulai.
   - Jangan tampilkan tombol jika remedialStatus sudah:
     SUBMITTED, COMPLETED, TIME_UP, FAILED_EFFORT, CHEATED, ACTIVE, INITIATED
     kecuali backend mengirim canStartRemedial: true setelah guru reset.
   - Lebih baik backend summary mengirim field eksplisit:
     canStartRemedial
     remedialUiState
     remedialMessage
     remedialActionLabel

7. Perbaiki parent WhatsApp share message.
   - Jika status held back, jangan tulis alasan "Nilai di bawah KKM".
   - Jika status NEEDS_REMEDIAL, baru tulis "Nilai di bawah KKM".
   - Jika FAILED_EFFORT/TIME_UP/CHEATED, tampilkan alasan sesuai status.

8. Backend summary sebaiknya mengirim data eksplisit per nilai:
   {
     sessionId,
     sessionName,
     subject,
     score,
     finalScore,
     remedialScore,
     displayedScore,
     kkm,
     isPassing,
     remedialStatus,
     remedialDeadline,
     hasRemedialAvailable,
     canStartRemedial,
     isHeldBack,
     holdbackReason,
     remedialUiState,
     remedialMessage,
     cheatingFlags
   }

9. Pastikan GradeMaster.tsx mengirim props className dan academicYear yang benar ke StudentProfileLayer.
   - className harus dari studentData.class_name.
   - academicYear harus dari studentData.academic_year jika ada.

10. Jangan menghapus fitur dokume