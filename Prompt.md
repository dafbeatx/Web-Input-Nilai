Tambahkan dan rapikan loading state agar UI dan backend terasa sinkron di seluruh alur utama aplikasi.

Fokus file utama:
1. src/components/grademaster/StudentProfileLayer.tsx
2. src/components/GradeMaster.tsx
3. src/components/grademaster/StudentRemedialLayer.tsx
4. src/components/grademaster/RemedialDashboardLayer.tsx
5. src/components/grademaster/StudentAccountsLayer.tsx
6. src/components/grademaster/DataCenterLayer.tsx
7. src/components/grademaster/StudentLoginLayer.tsx
8. src/components/grademaster/StudentClaimLayer.tsx

Jangan mengubah logika bisnis besar, fokus pada loading state, disabled state, skeleton, dan pesan proses agar user tidak bingung.

Prinsip umum:
1. Setiap aksi async yang memanggil backend harus punya loading state lokal.
2. Tombol yang memicu request harus disabled selama request berjalan.
3. Tampilkan teks proses yang spesifik, bukan hanya spinner generik.
4. Jangan tampilkan empty state sebelum loading selesai.
5. Jangan biarkan user menekan tombol submit/start/import/export berkali-kali.
6. Jika request gagal, loading harus reset dan error toast harus muncul.
7. Jika request berhasil, tampilkan success toast dan refresh data terkait.
8. Hindari race condition: jika ada beberapa fetch paralel, gunakan Promise.allSettled atau counter loading yang jelas.
9. Jangan menghapus fitur yang sudah ada.
10. Pastikan TypeScript tetap aman.

Detail per area:

A. StudentProfileLayer.tsx
- Gunakan isLoadingSummary untuk semua area yang bergantung pada studentSummary:
  - banner status remedial;
  - kartu rata-rata nilai;
  - jumlah pending remedial;
  - dokumen;
  - grafik nilai;
  - daftar riwayat ujian.
- Tambahkan isRefreshingProfile untuk tombol sync manual.
- Saat sync manual diklik, jalankan:
  Promise.allSettled([
    fetchStudentLogs(),
    fetchStudentSummary(),
    fetchAttendanceLogs()
  ])
- Tombol sync harus disabled dan menampilkan spinner saat isRefreshingProfile true.
- Jangan tampilkan "Tidak ada data ujian" atau "Tidak ada log presensi" sebelum loading selesai.
- Tambahkan startingRemedialSessionName untuk tombol "Mulai Remedial".
  Saat tombol diklik:
  - setStartingRemedialSessionName(grade.sessionName)
  - disabled semua tombol remedial
  - tampilkan teks "Memuat Sesi..."
  - reset saat handler selesai/gagal.
- Jika onStartRemedial belum async, ubah supaya bisa await dari parent atau bungkus dengan Promise.resolve.

B. GradeMaster.tsx
- Tambahkan loading state untuk navigasi dari profile ke remedial:
  isOpeningRemedialFromProfile atau openingRemedialSessionName.
- Dalam handleStudentRemedialFromProfile:
  - set loading sebelum fetch/open session
  - disable trigger dari child
  - clear loading di finally
  - tampilkan toast error jika gagal memuat sesi remedial.
- Pastikan academicYear dan className yang dipakai sesuai studentData.

C. StudentRemedialLayer.tsx
- Pastikan isSubmitting dipakai untuk:
  - tombol Mulai Ujian;
  - tombol Submit Jawaban;
  - tombol lanjut mode terbatas;
  - timeout auto-submit.
- Tambahkan label yang spesifik:
  - "Memulai sesi..."
  - "Mengirim jawaban..."
  - "Menyimpan jawaban saat waktu habis..."
  - "Mencoba ulang pengiriman..."
- Jika submit retry berjalan, tampilkan attempt count.
- Saat jaringan gagal dan localStorage backup dibuat, tampilkan UI warning tetap, bukan hanya toast.
- Pastikan hasSubmittedRef reset jika semua retry gagal.

D. RemedialDashboardLayer.tsx
- Tambahkan loading per aksi:
  - extendingTimeStudentId
  - reviewingStudentId
  - finalizingStudentId
  - resettingStudentId
  - loadingSecurityAnalysis
- Tombol aksi per siswa harus disabled hanya untuk siswa yang sedang diproses.
- Setelah aksi sukses, refresh data dashboard atau update state lokal.
- Tampilkan pesan proses:
  - "Menambah waktu..."
  - "Menyimpan review..."
  - "Finalisasi nilai..."
  - "Reset remedial..."

E. StudentAccountsLayer.tsx
- Perkuat isPromoting:
  - modal tidak bisa ditutup saat promosi berjalan;
  - tombol batal disabled;
  - tombol submit menampilkan "Memindahkan..."
  - setelah berhasil, tampilkan pesan jelas:
    "Siswa telah dipindahkan ke {toClass} ({toYear}). Ubah filter tahun ajaran untuk melihatnya."
- Setelah promosi, jangan langsung terlihat seperti data hilang tanpa penjelasan.
- Jika memungkinkan, tampilkan jumlah siswa yang akan dipromosikan sebelum submit.

F. DataCenterLayer.tsx
- Tambahkan loading untuk:
  - fetchStudents;
  - import Excel;
  - generate PDF;
  - delete student;
  - upload signature.
- Jangan tampilkan empty table sebelum fetch selesai.
- Tombol import/export/delete disabled saat request berjalan.

G. StudentLoginLayer.tsx dan StudentClaimLayer.tsx
- Tambahkan loading untuk:
  - cek akun;
  - link Google;
  - claim profile;
  - redirect setelah sukses.
- Tampilkan pesan:
  - "Memverifikasi akun..."
  - "Mengaitkan profil..."
  - "Memuat profil siswa..."
- Disable input dan tombol selama proses.

H. Error handling
- Semua async handler wajib:
  try {
    setLoading(true)
    ...
  } catch (err) {
    setToast({ message: err.message || 'Terjadi kesalahan', type: 'error' })
  } finally {
    setLoading(false)
  }

I. Testing
Jalankan:
- npx tsc --noEmit
- npm run build

Ekspektasi hasil:
- Tidak ada tombol async yang bisa diklik berkali-kali.
- Empty state tidak muncul sebelum fetch selesai.
- User selalu melihat proses yang sedang terjadi.
- Setelah kenaikan kelas, profile, remedial, dashboard, login, dan data center terasa sinkron dengan backend.
- Tidak ada perubahan destruktif pada logika bisnis utama.