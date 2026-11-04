# Fitri Ani Rahayu – Phaser 3 Character Frames

Karakter pixel-art berdasarkan foto referensi: hijab navy, kacamata, seragam navy, emblem dada dan patch lengan.

## Isi
- 32 PNG individual, masing-masing 64×64 px, RGBA transparan.
- `idle/`: pose diam untuk arah `down`, `left`, `right`, `up` (4 frame per arah).
- `walk/`: animasi berjalan untuk arah yang sama (4 frame per arah).
- `manifest.json`: daftar file dan susunan animasi.
- `preview_fitri_ani_rahayu.png`: pratinjau 4 kolom × 8 baris.

## Mapping Phaser 3

Gunakan file per-frame sebagai texture terpisah atau gabungkan kembali sesuai kebutuhan. Nama arah: `down`, `left`, `right`, `up`. Frame idle dapat dipakai sebagai animasi pendek atau cukup gunakan satu frame untuk keadaan diam.

Catatan: frame telah dinormalisasi ke kanvas 64×64 dengan posisi kaki rata; uji timing dan anchor di game agar transisi animasinya terasa halus.
