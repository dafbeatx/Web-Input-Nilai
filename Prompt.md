Menurut saya, fitur kenaikan kelas belum 100% oke.

Yang sudah sinkron:

UI mengirim fromClass, toClass, fromYear, toYear.

Backend menerima dan memvalidasi field yang sama.

Backend mengubah akun siswa ke kelas/tahun baru.

Backend membuat data behavior untuk kelas/tahun baru.

Yang belum sinkron / masih berisiko:

Username masih memakai suffix kelas lama setelah siswa naik kelas.

UI tetap refresh tahun lama setelah promosi ke tahun baru, sehingga siswa bisa terlihat hilang.

Tidak ada pre-check konflik di kelas tujuan sebelum update massal.

Default behavior point tidak konsisten: alur biasa 0, alur promosi 100.

Promosi memindahkan akun, bukan membuat salinan record tahun baru; ini perlu dipastikan sesuai kebutuhan.

Daftar kelas UI diambil dari gm_behaviors, bukan langsung dari gm_student_accounts, sehingga bisa tidak lengkap jika data behavior belum sinkron.