# AI Agent Task — Single Classroom Background + Separate Interaction Marker

## Aturan visual utama
Gunakan **satu background utuh** untuk interior kelas. Jangan memisahkan atau membuat ulang meja, kursi, papan tulis, lemari, rak buku, jendela, jam, tanaman, komputer, foto, atau dekorasi sebagai sprite terpisah. Semua elemen tersebut sudah menyatu dan tertata di `classroom_interior_background.png`.

**Hanya penanda interaksi pintu yang terpisah**, yaitu `door_interaction_marker.png`. Marker harus menjadi overlay transparan yang dapat ditampilkan/disembunyikan dan diposisikan oleh Phaser. Jangan menanam tulisan `E Masuk` atau `E Keluar` ke dalam background.

## File aset
- `classroom_interior_background.png` — satu gambar interior kelas utuh, resolusi 1672 × 941 px.
- `door_interaction_marker.png` — satu overlay transparan berisi keycap `E`, panel label kosong, chevron, dan alas interaksi hijau; label diisi secara dinamis dari kode.
- `preview_classroom_with_marker.png` — contoh tampilan akhir untuk referensi visual saja, bukan background runtime.

## Penataan scene
1. Tampilkan `classroom_interior_background.png` sebagai satu image/background pada scene interior.
2. Pertahankan rasio aspek background; gunakan scale-to-fit/contain pada viewport dan jangan memotong pintu atau furnitur.
3. Karakter pemain dirender sebagai game object tersendiri di atas background.
4. Buat collider tak terlihat untuk dinding, meja-kursi, meja guru, lemari, rak buku, dan area tanaman besar. Collider adalah data fisika/geometry, bukan gambar atau sprite tambahan.
5. Karena furnitur menyatu ke background, collider harus mengikuti footprint visual furnitur sehingga karakter tidak terlihat berjalan menembus meja atau lemari.
6. Gunakan satu layout dasar yang sama untuk Kelas VII, VIII, dan IX; nama kelas ditampilkan melalui UI, bukan mengubah atau memecah gambar furnitur.

## Sistem marker pintu
- Di luar kelas: ketika pemain masuk ke trigger pintu kelas, tampilkan marker dengan label dinamis `Masuk Kelas VII` (atau VIII/IX).
- Di dalam kelas: ketika pemain mendekati pintu keluar di bagian bawah ruangan, tampilkan marker yang sama dengan label `Keluar Kelas`.
- Ketika pemain menjauh dari area trigger, sembunyikan marker.
- Desktop/PID: tombol `E` mengaktifkan aksi yang sesuai.
- HP/tablet: marker dapat ditap atau tombol interaksi layar memanggil fungsi yang sama.
- Marker tidak boleh selalu terlihat di layar dan tidak boleh tertanam ke background.

## Transisi scene
1. Simpan posisi pemain di depan pintu luar sebelum masuk kelas.
2. Pindahkan pemain ke spawn point interior saat masuk.
3. Saat keluar, kembalikan pemain ke posisi pintu luar yang disimpan, bukan ke spawn awal sekolah.
4. Gunakan transisi ringan (fade singkat) tanpa reload seluruh game atau menghapus pilihan karakter.
5. Pastikan Character Selector, input movement, kamera, dan state game tetap berjalan setelah transisi.

## Implementasi Phaser 3
- Preload background sebagai image dan marker sebagai image transparan.
- Marker dibuat sebagai object terpisah dari background; label dapat menggunakan `Text`/DOM overlay di atas ruang kosong pada panel marker.
- Gunakan `Zone`/trigger tak terlihat di koordinat pintu untuk mengatur visibilitas marker.
- Buat collider melalui `Arcade Physics` static bodies atau geometry yang sesuai dengan engine project.
- Jangan gunakan collision pada seluruh background; pemain harus bisa bergerak di area lantai yang walkable.
- Sesuaikan koordinat collider dengan resolusi desain 1672 × 941, lalu skala bersama background jika viewport berubah.

## Struktur file yang disarankan
```text
public/assets/classrooms/
  classroom_interior_background.png
  door_interaction_marker.png
src/game/scenes/
  ClassroomScene.ts
```

## Kriteria selesai
- [ ] Interior kelas tampil sebagai satu background utuh.
- [ ] Semua furnitur dan dekorasi tetap menyatu dalam background.
- [ ] Hanya marker pintu menjadi aset visual overlay terpisah.
- [ ] Background bersih tanpa prompt atau alas interaksi tertanam.
- [ ] Marker masuk/keluar muncul hanya saat pemain dekat pintu.
- [ ] Label marker berubah sesuai konteks dan nama kelas.
- [ ] Tombol E berfungsi di desktop/PID dan tap berfungsi di HP.
- [ ] Collider tak terlihat mencegah karakter menembus furnitur/dinding.
- [ ] Pemain bisa keluar dan kembali ke posisi pintu semula.
