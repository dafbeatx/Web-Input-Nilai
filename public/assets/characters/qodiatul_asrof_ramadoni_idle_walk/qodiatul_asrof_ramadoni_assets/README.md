# Qodiatul Asrof Ramadoni — Operator Sekolah

Aset karakter pixel-art untuk Phaser 3.

- 32 frame PNG individual (RGBA/transparan)
- Ukuran setiap frame: 64 × 64 px
- Animasi idle: 4 arah × 4 frame
- Animasi walk: 4 arah × 4 frame
- Arah: down, left, right, up

## Struktur

- `idle/down/`, `idle/left/`, `idle/right/`, `idle/up/`
- `walk/down/`, `walk/left/`, `walk/right/`, `walk/up/`
- `manifest.json` berisi daftar file per animasi dan arah.
- `preview/preview_contact_sheet.png` adalah pratinjau semua frame.

## Catatan

Gunakan frame pada folder `idle` saat karakter tidak bergerak dan folder `walk` saat karakter bergerak. Semua frame memiliki kanvas 64 × 64 px dengan transparansi. Periksa konsistensi visual dan timing animasi saat integrasi ke scene Phaser.
