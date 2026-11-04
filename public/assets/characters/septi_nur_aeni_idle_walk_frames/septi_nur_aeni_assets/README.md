# Septi Nur Aeni — Phaser 3 Character Frames

## Isi aset
- 32 PNG individual, transparan (RGBA).
- 16 frame `idle` (diam): 4 arah × 4 variasi.
- 16 frame `walk` (berjalan): 4 arah × 4 frame.
- Setiap frame: 64 × 64 px.

## Arah
- `down`: menghadap depan / bawah layar.
- `left`: menghadap kiri.
- `right`: menghadap kanan.
- `up`: menghadap belakang / atas layar.

## Nama file
`septi_<animasi>_<arah>_<nomor>.png`
Contoh: `septi_walk_down_1.png`.

## Catatan integrasi
Gunakan empat frame `idle` sebagai variasi diam atau pilih satu frame idle utama per arah. Untuk animasi berjalan, putar empat frame `walk` sesuai arah gerak. Semua frame memakai kanvas 64×64 dan baseline kaki yang diseragamkan; tetap uji offset visual, anchor, kecepatan animasi, serta hitbox di scene Phaser project.
