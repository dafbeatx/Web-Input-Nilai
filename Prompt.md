Perbaiki sinkronisasi UI dan backend untuk alur submit remedial.

Konteks masalah:
Banyak siswa mengeluh tidak bisa mengirim jawaban remedial, atau setelah berhasil submit tiba-tiba nilai masih di bawah KKM tanpa penjelasan UI yang jelas.

File utama yang perlu diperiksa dan diperbaiki:
1. src/components/grademaster/StudentRemedialLayer.tsx
2. src/lib/grademaster/services/remedial.service.ts
3. Jika perlu, src/app/api/grademaster/students/remedial/route.ts

Jangan ubah RemedialManagementLayer.tsx.

Masalah yang sudah ditemukan:
1. Backend memiliki mekanisme holdback:
   - Jika masih ada teman sekelas yang belum menyelesaikan remedial, backend menahan nilai remedial siswa.
   - Backend mengembalikan final_score lama/original agar nilai final belum berubah.
   - Backend menambahkan flag:
     "Nilai remedial ditahan sementara menunggu teman sekelas selesai"
   - Namun frontend hanya membaca newFinalScore/final_score.
   - Jika skor lama masih di bawah KKM, frontend menampilkan pesan:
     "Jawaban Remedial berhasil dikumpulkan. Nilai Anda belum mencapai KKM."
   - Akibatnya siswa mengira gagal remedial, padahal nilainya bisa saja hanya ditahan sementara.

2. Backend membatasi nilai remedial maksimal KKM:
   - finalScore = Math.max(0, Math.min(rawScore, kkmScore) - penaltyAmount)
   - Ini boleh dipertahankan, tetapi UI harus menjelaskan apakah siswa:
     a. benar-benar belum mencapai KKM;
     b. remedial valid tetapi nilainya ditahan;
     c. ditolak karena effort kurang;
     d. terkena penalti;
     e. timeout;
     f. curang/didiskualifikasi.

3. Frontend punya validasi submit:
   - jawaban minimal 20 karakter;
   - menolak frasa seperti "tidak tahu", "kosong", "asdf", dll;
   - menolak jawaban repetitif.
   Pastikan UI menjelaskan validasi ini sebelum siswa submit, bukan hanya setelah gagal.

4. Backend punya validasi tambahan:
   - minimal 5 menit pengerjaan;
   - minimal effort;
   - jika terlalu cepat atau effort kurang, status menjadi FAILED_EFFORT dan skor 0.
   Pastikan UI menampilkan alasan yang konsisten dengan backend.

5. Ada potensi bug TIMEOUT di remedial.service.ts:
   - Blok scoring hanya dijalankan untuk status COMPLETED atau CHEATED.
   - Tetapi logika TIMEOUT berada di dalam blok tersebut, sehingga TIMEOUT kemungkinan tidak pernah diproses saat status benar-benar TIMEOUT.
   - Perbaiki agar status TIMEOUT juga diproses secara benar, menyimpan jawaban yang sudah diisi, menghitung skor jika memungkinkan, dan menampilkan UI yang jelas.

Target perbaikan:
1. Backend harus mengembalikan response submit remedial yang eksplisit, misalnya:
   - status
   - finalScore
   - remedialScore
   - rawScore jika ada
   - displayedScore
   - isHeldBack
   - holdbackReason
   - pendingRemedialCount
   - scoringReason
   - failedReason
   - penaltyApplied
   - remedialAnswerKeys
   - essayDetails
   - cheatingFlags

2. Jika nilai ditahan:
   - Jangan hanya mengembalikan final_score lama tanpa konteks.
   - Response harus menyatakan isHeldBack: true.
   - Sertakan remedialScore hasil remedial yang sebenarnya jika aman ditampilkan.
   - Sertakan pesan:
     "Jawaban berhasil dikumpulkan. Nilai remedial Anda sedang ditahan sementara sampai semua siswa remedial di kelas ini selesai."

3. Frontend StudentRemedialLayer.tsx harus:
   - membedakan status SUBMITTED biasa, FAILED_EFFORT, TIME_UP/TIMEOUT, CHEATED, dan HELD_BACK;
   - jika isHeldBack true, tampilkan UI khusus:
     "Jawaban berhasil dikumpulkan, tetapi nilai final ditahan sementara."
   - jangan tampilkan pesan "Nilai Anda belum mencapai KKM" untuk kasus holdback;
   - tampilkan jumlah siswa tertunggak jika backend mengirim pendingRemedialCount;
   - tampilkan skor remedial sementara jika backend mengirim remedialScore;
   - tetap tampilkan finalScore lama sebagai "nilai final sementara", bukan sebagai hasil remedial gagal.

4. Perbaiki timeout:
   - handleStatusUpdate('TIMEOUT') dari frontend harus mengirim jawaban yang sudah ada.
   - Backend harus memproses TIMEOUT di jalur scoring yang benar.
   - Jika jawaban cukup valid, simpan dan hitung skor sebagai TIME_UP.
   - Jika jawaban kosong/tidak valid, tampilkan alasan jelas.
   - Frontend harus menampilkan apakah jawaban timeout berhasil disimpan atau tidak.

5. Perbaiki error dan retry UI:
   - Jika submit gagal karena network, tampilkan bahwa jawaban disimpan lokal.
   - Jika backend menolak karena RESET_REQUIRED, tampilkan instruksi jelas untuk login ulang.
   - Jika backend menolak karena terlalu cepat/effort kurang, tampilkan alasan dari backend, bukan pesan generik.

6. Pastikan status enum/frontend sinkron dengan backend:
   - RULES
   - INFO
   - GUIDE
   - EXAM
   - SUBMITTED
   - FAILED_EFFORT
   - TIME_UP
   - TIMEOUT jika masih dipakai
   - CHEATED
   - AI_BOT_DETECTED
   - SECOND_CHANCE
   Jangan gunakan status yang tidak ditangani UI.

7. Tambahkan atau perbaiki helper di frontend untuk menentukan pesan hasil:
   - submitted + isHeldBack
   - submitted + score >= KKM
   - submitted + score < KKM
   - failed effort
   - timeout with saved answers
   - timeout with no valid answers
   - cheated

8. Jangan menghapus fitur keamanan/proctoring yang sudah ada.
9. Jangan melemahkan validasi secara sembarangan, tetapi buat pesan UI lebih jelas.
10. Jalankan minimal:
    - npx tsc --noEmit
    - npm run build

Ekspektasi hasil:
- Siswa yang remedialnya valid tetapi nilainya ditahan tidak lagi melihat pesan seolah gagal KKM.
- Siswa mendapat alasan jelas jika submit ditolak.
- Timeout tetap menyimpan jawaban yang sudah diisi.
- Backend dan UI menggunakan status dan response field yang konsisten.
- RemedialManagementLayer.tsx tidak berubah.