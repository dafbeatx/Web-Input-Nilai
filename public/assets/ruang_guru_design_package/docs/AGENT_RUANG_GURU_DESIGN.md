# Implementasi Ruang Guru — Background Tunggal + Penanda Interaksi Terpisah

## Tujuan
Tambahkan interior Ruang Guru SMP Terpadu Al-Ittihadiyah ke game Phaser 3 menggunakan **satu gambar background utuh** dan **satu aset penanda interaksi pintu yang terpisah**. Desain visual harus mengikuti `assets/ruang_guru_background.png`.

## Aturan visual wajib
1. Gunakan `assets/ruang_guru_background.png` sebagai satu-satunya background interior.
2. **Jangan memecah** ruangan menjadi sprite dinding, lantai, meja, kursi, sofa, lemari, printer, sekat, buku, atau dekorasi. Semua elemen tersebut sudah tersusun di dalam satu gambar.
3. Jangan mengubah tata letak atau menggambar ulang furnitur. Jangan menambahkan NPC ke background.
4. Hanya penanda interaksi pintu yang boleh menjadi overlay terpisah, yaitu `assets/door_interaction_marker.png`.
5. Teks prompt seperti `E Keluar Ruang Guru` harus dibuat sebagai UI Phaser/HTML secara dinamis, bukan dibakar ke background.

## Spesifikasi desain yang harus dipertahankan
- Bentuk ruangan: persegi panjang, luas, tampak top-down/isometric pixel-art.
- Palet dinding: hijau dan putih.
- Dua area dipisahkan sekat tengah:
  - sisi kiri: area khusus guru laki-laki;
  - sisi kanan: area khusus guru perempuan.
- Setiap meja guru memiliki tumpukan buku, alat tulis, dan perangkat kerja.
- Terdapat **dua printer** di area layanan/peralatan tengah.
- Area sofa berada di bagian tengah-bawah sebagai area bersama.
- Rak buku/arsip, lemari, jendela, tanaman, papan informasi, dan papan nama Ruang Guru tetap terlihat.
- Tidak ada karakter/NPC pada background.

## Integrasi Phaser 3
### Background
- Preload `ruang_guru_background.png` sebagai satu texture.
- Tampilkan satu image pada scene interior, dengan origin (0, 0), lalu atur skala secara proporsional agar seluruh ruangan terlihat.
- Pertahankan rasio aspek gambar; jangan melakukan crop yang menghilangkan area ruangan.
- Gunakan kamera dan viewport responsif untuk desktop, HP, dan PID.

### Collision
Background adalah gambar visual, bukan collision map. Buat collision body/zone transparan di kode hanya pada area yang memang tidak boleh dilewati:
- dinding perimeter;
- sekat tengah;
- meja kerja dan kursi;
- lemari/rak besar;
- sofa dan meja sofa;
- printer/perabot besar.

Jangan membuat satu collision rectangle menutupi seluruh ruangan. Sisakan jalur jalan yang cukup lebar di antara meja dan di sekitar sofa. Gunakan hitbox kecil di bagian kaki/bawah objek bila diperlukan agar karakter bisa tampak berada di depan objek secara natural.

### Pintu dan penanda interaksi
- Letakkan `door_interaction_marker.png` di titik pintu bagian bawah-tengah sesuai gambar background.
- Atur marker sebagai overlay terpisah di atas lantai; jangan menutupi pintu atau label desain yang sudah ada.
- Buat interaction zone kecil di depan pintu. Prompt hanya tampil saat pemain masuk radius/zone tersebut.
- Desktop/PID: tampilkan prompt `E  Keluar Ruang Guru`; tombol `E` menjalankan transisi kembali ke halaman sekolah.
- Mobile: tampilkan tombol sentuh `Keluar` saat pemain berada di interaction zone.
- Saat keluar, kembalikan pemain ke titik spawn di luar Ruang Guru yang menghadap pintu. Simpan posisi masuk sebelumnya bila sistem scene saat ini mendukungnya.
- Saat pemain menjauh dari pintu, sembunyikan prompt dan tombol.

## Struktur file yang disarankan
```text
public/assets/rooms/ruang-guru/
  ruang_guru_background.png
  door_interaction_marker.png
```

Simpan dokumen ini di folder instruksi agent project, misalnya `.agents/tasks/AGENT_RUANG_GURU_DESIGN.md`.

## Acceptance criteria
- [ ] Interior memakai satu background utuh, tidak ada furnitur yang dipisah menjadi sprite.
- [ ] Hanya penanda interaksi pintu berupa aset terpisah.
- [ ] Area guru laki-laki dan perempuan terlihat terpisah oleh sekat.
- [ ] Warna hijau-putih tetap konsisten.
- [ ] Meja-meja menampilkan tumpukan buku.
- [ ] Ada tepat dua printer.
- [ ] Sofa dan area duduk bersama tersedia.
- [ ] Collision tidak menutupi jalur berjalan.
- [ ] Prompt pintu muncul hanya ketika pemain dekat.
- [ ] Fungsi keluar berjalan di desktop/PID dan mobile.
- [ ] Tidak ada NPC yang tertanam pada background.
