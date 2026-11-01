# ROADMAP: INDONESIAN LIFE RP

**Implementation Phases & Milestone Tracking**

---

## 📌 Phase 1: Foundation (Sedang Berjalan)
- [x] Audit dependensi repository & integrasi Next.js 16.
- [x] Instalasi game engine Phaser 3 (`phaser@3.88.2`).
- [x] Pembuatan dokumen rancangan: `GAME_DESIGN_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `ROADMAP.md`.
- [ ] Penyusunan struktur folder modular (`src/game/`, `src/components/game/`, `src/lib/game/`).
- [ ] Penyiapan skema migrasi awal Supabase PostgreSQL & RLS policy.
- [ ] Implementasi `DeviceDetector` untuk identifikasi otomatis Android, Desktop, dan Papan Interaktif (IFP).

---

## 📌 Phase 2: Playable Prototype (Fokus Utama Berikutnya)
- [ ] Pembuatan peta kota kecil prototype "Nusantara Asri" (jalan raya, trotoar, gedung sekolah, warung kelontong, pepohonan, lampu jalan).
- [ ] Pembuatan entitas `Player` dengan animasi sprite 4/8 arah dan collider fisika.
- [ ] Sistem kamera dinamis yang mengikuti karakter pemain dengan batas area (*world bounds*).
- [ ] Implementasi sistem kontrol 3 mode:
  - **Mode Android**: Virtual joystick analog sentuh + tombol aksi/sprint.
  - **Mode Desktop**: Kontrol keyboard WASD/Panah + Space/Shift.
  - **Mode Papan Interaktif**: Tombol kontrol sentuh ekstra besar (min 64px) tanpa keyboard fisik.
- [ ] Sistem interaksi objek (mendekati pintu warung/sekolah memicu prompt interaksi [E] / tombol aksi).

---

## 📌 Phase 3: Authentication & Character Creation
- [ ] Antarmuka registrasi & login pemain via Supabase Auth.
- [ ] Layar kustomisasi karakter (nama, gender, warna kulit, model baju casual/batik/seragam).
- [ ] Sinkronisasi dan penyimpanan karakter ke tabel `characters` Supabase PostgreSQL.
- [ ] Persistensi posisi terakhir karakter saat keluar dan masuk kembali (*re-spawn*).

---

## 📌 Phase 4: Multiplayer Networking
- [ ] Pengelompokan room berbasis channel Supabase Realtime (`game_rooms`).
- [ ] Sinkronisasi status kehadiran pemain (*Presence*: avatar, nama, status online).
- [ ] Sinkronisasi pergerakan antarpemain via Broadcast channel dengan interpolasi pergerakan halus (LERP).
- [ ] Sistem obrolan lokal (*bubble chat* di atas kepala) & kotak obrolan global.
- [ ] Penanganan otomatis saat koneksi terputus dan rekoneksi (*auto-reconnect*).

---

## 📌 Phase 5: Roleplay Systems (Ekonomi & Profesi)
- [ ] Sistem dompet pemain (`player_wallets`) dan transaksi belanja di warung.
- [ ] Pekerjaan interaktif: Kurir antar paket, Kasir minimarket, dan Pelajar sekolah.
- [ ] Sistem inventori barang pemain (`player_inventory`).
- [ ] Papan interaktif di dalam kelas sekolah yang dapat dicoret/ditulis antarpemain.

---

## 📌 Phase 6: PWA, Polish & Production Deployment
- [ ] Konfigurasi Web App Manifest & Service Worker untuk instalasi PWA di Android dan Smart Board.
- [ ] Uji performa 60 FPS pada perangkat spesifikasi menengah ke bawah.
- [ ] Pengujian keamanan endpoint transaksi dan verifikasi RLS policy.
- [ ] Otomasi build dan deployment produksi ke Vercel via GitHub `main`.

