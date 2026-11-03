# Paket Spritesheet Karakter Game Sekolah (Phaser 3)

Isi paket:
- 5 spritesheet PNG, masing-masing 256 x 256 px.
- Setiap spritesheet terdiri dari grid 4 kolom x 4 baris.
- Setiap frame berukuran 64 x 64 px dan memiliki transparansi.
- Folder `frames/` berisi 16 PNG terpisah per karakter.

## Urutan baris
- Baris 1 (frame 0-3): menghadap depan / down.
- Baris 2 (frame 4-7): menghadap kiri.
- Baris 3 (frame 8-11): menghadap kanan.
- Baris 4 (frame 12-15): menghadap belakang / up.

## Integrasi Phaser 3 (contoh)
```ts
this.load.spritesheet('rian', '/assets/rian_pratama_spritesheet_256.png', {
  frameWidth: 64,
  frameHeight: 64,
});

this.anims.create({
  key: 'rian-down',
  frames: this.anims.generateFrameNumbers('rian', { start: 0, end: 3 }),
  frameRate: 8,
  repeat: -1,
});
```

Catatan: file sudah dipotong dan disusun ke ukuran frame teknis. Karena sumbernya adalah gambar AI, variasi gerak antar-frame tidak sepenuhnya seragam; cek animasi di Phaser dan sesuaikan frame yang tampak terlalu diam/berkedip sebelum rilis.
