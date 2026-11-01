# GAME DESIGN DOCUMENT: INDONESIAN LIFE RP

**Version:** 1.0.0 (Phase 1 Prototype)  
**Genre:** Open World 2D Life Simulation Roleplay  
**Platform Target:** Android Smartphone, PC/Desktop Windows, Interactive Flat Panel (Papan Interaktif Digital)  
**Engine & Stack:** Next.js (App Router), React, Tailwind CSS, Phaser 3, Supabase (PostgreSQL, Realtime, Storage)  

---

## 1. Executive Summary & Vision

**Indonesian Life RP** adalah game simulasi kehidupan dan roleplay dunia terbuka 2D multipemain yang mengangkat tema keseharian masyarakat Indonesia kontemporer. Pemain menjalani kehidupan di sebuah kota virtual yang hidup, berinteraksi dengan sesama pemain secara realtime, bekerja, memiliki properti, berbelanja di warung dan pasar, serta bersekolah di lingkungan edukatif.

Game ini didesain khusus agar dapat dimainkan secara mulus lintas perangkat (*cross-platform*):
1. **Smartphone Android**: Kontrol layar sentuh dengan virtual joystick dan tombol aksi adaptif.
2. **Desktop / PC Windows**: Kontrol keyboard WASD / panah, shortcut, dan navigasi mouse presisi.
3. **Interactive Flat Panel (Smart Board)**: Antarmuka ramah sentuhan berukuran besar, navigasi drag-and-swipe tanpa keyboard fisik, mendukung resolusi standar 1080p landscape.

Seluruh pemain berbagi satu dunia, satu server room, satu sistem akun, dan satu database terpadu.

---

## 2. World Setting: Kota Mini "Nusantara Asri" (Prototype Phase)

Untuk tahap prototype awal, dunia permainan difokuskan pada satu area kota kecil yang padat, kaya interaksi, dan orisinal:

1. **Kawasan Pendidikan (Sekolah / Kampus)**:
   - Gedung sekolah dengan ruang kelas, papan tulis interaktif, dan lapangan olahraga.
2. **Kawasan Komersial (Pusat Bisnis & UMKM)**:
   - Warung Madura / Minimarket (membeli kebutuhan pokok dan makanan).
   - Warung Kopi / Angkringan (titik kumpul sosial dan obrolan antarpemain).
   - Bengkel & Bank Daerah.
3. **Kawasan Pelayanan Publik**:
   - Puskesmas / Rumah Sakit mini.
   - Pos Polisi & Kantor Kelurahan.
4. **Kawasan Pemukiman & Ruang Terbuka**:
   - Kompleks perumahan warga.
   - Taman kota dengan pepohonan, jalan setapak, dan lampu jalan khas Indonesia.
   - Jalan raya beraspal dengan zebra cross dan trotoar pejalan kaki.

---

## 3. Core Gameplay Systems

### 3.1. Character System (Sistem Karakter)
- **Identitas**: Nama lengkap karakter, gender, usia, dan biodata singkat.
- **Kustomisasi Penampilan**: Warna kulit, gaya rambut, pakaian atasan (kaos santai, seragam sekolah, batik, kemeja kerja), pakaian bawahan, dan aksesori.
- **Status Karakter**: Energi, kelaparan, dan reputasi sosial.
- **Penyimpanan**: Data profil dan kustomisasi tersimpan aman di tabel `characters` Supabase PostgreSQL.

### 3.2. Movement & Physics System
- **Pergerakan 8 Arah**: Bergerak secara lancar (Up, Down, Left, Right, dan 4 diagonal) dengan kecepatan normal dan tombol sprint (*Shift* atau tombol *Lari*).
- **Collision Detection**: Sistem tabrakan solid dengan dinding bangunan, pagar, kendaraan, dan pembatas jalan via Arcade Physics Phaser 3.
- **Siklus Animasi**: Animasi 4/8 frame untuk posisi idle, jalan (walk), dan lari (sprint) sesuai orientasi hadap.
- **Kamera Dinamis**: Kamera mengikuti posisi karakter utama dengan lerp/smoothing lembut dan pembatas area (*world bounds*).

### 3.3. Interaction System (Sistem Interaksi)
- **Proximity Detection**: Saat mendekati objek interaktif (pintu, kursi, kasir warung, NPC), muncul prompt interaksi (*[E] Interaksi* pada PC atau tombol aksi besar pada layar sentuh).
- **NPC Interaktif**: NPC penjaga warung, guru sekolah, dan petugas kelurahan yang memberikan dialog, misi sederhana, atau membuka toko.
- **Pintu & Interior**: Masuk ke dalam bangunan berpindah scene secara instan atau fade-to-black.

### 3.4. Economy & Jobs System
- **Mata Uang**: Rupiah Virtual (Rp).
- **Pekerjaan Awal**:
  - Pelajar (mengikuti kegiatan kelas, mendapatkan uang saku).
  - Kasir Toko / UMKM (melayani pelanggan).
  - Kurir Antar Barang (mengantar paket ke alamat di kota).
- **Gaji & Transaksi**: Gaji ditransfer otomatis ke dompet (`player_wallets`) dan divalidasi di sisi server Supabase RPC.
- **Toko & Belanja**: Membeli makanan, minuman, dan item kosmetik.

### 3.5. Social & Communication System
- **Chat Realtime**:
  - *Chat Lokal*: Pesan hanya terlihat oleh pemain dalam radius 15 meter (bubble chat di atas kepala + box chat).
  - *Chat Global*: Saluran obrolan publik se-kota.
- **Status Presence**: Mengetahui pemain lain yang sedang aktif di room yang sama melalui Supabase Presence.
- **Emote Karakter**: Melambai (wave), duduk, tepuk tangan, dan ekspresi emosi.

---

## 4. Multiplatform Input & Control Architecture

Sistem permainan memiliki arsitektur pendeteksi mode kontrol otomatis (`DeviceControlService`) yang menyesuaikan UI dan input handler:

| Fitur | Mode Android | Mode Desktop (PC) | Mode Papan Interaktif (IFP) |
| :--- | :--- | :--- | :--- |
| **Navigasi Gerak** | Virtual Joystick (Layar Kiri Bawah) | Keyboard WASD / Arrow Keys | Virtual Joystick Besar / Tap to Move |
| **Tombol Interaksi** | Tombol Aksi Sentuh (Layar Kanan Bawah) | Tombol Keyboard `E` / Spasi | Tombol Aksi Ekstra Besar (min 64px) |
| **Sprint / Lari** | Tombol Toggle Sprint | Tahan Tombol `Shift` | Tombol Toggle Lari |
| **Obrolan / Chat** | Tombol Chat Overlay & Virtual Keyboard | Tombol `Enter` untuk fokus chatbox | Tombol Chat Cepat / Frasa Preset |
| **Navigasi Menu** | Touch Drawer | Mouse Click & Keyboard Escape | Large Touch Tiles & Tab |
| **Orientasi Layar** | Landscape diutamakan (dukung Portrait) | Jendela Browser / Fullscreen (F11) | 1080p Fullscreen Landscape |

---

## 5. Visual Art & Audio Direction

- **Gaya Visual**: 2D Pixel Art / Clean Vector Top-Down (perspektif $3/4$ mirip Pokemon/Stardew Valley dengan arsitektur khas Indonesia: genteng tanah liat, warung kelontong, plang jalan hijau, pohon rindang).
- **Palet Warna**: Natural, hangat, cerah, tidak menggunakan gradien rainbow yang tidak bertujuan (*antislop compliant*).
- **Audio**: Suasana perkotaan tropis (gemerisik angin, burung, suara langkah kaki kayu/aspal, bel sekolah, dan efek suara klik tombol yang memuaskan).

