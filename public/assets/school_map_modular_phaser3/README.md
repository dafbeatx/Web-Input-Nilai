# Modular School Map Assets — Phaser 3

Paket ini sengaja **tidak memakai satu gambar map yang diratakan**. Lantai, bangunan, dan props disimpan terpisah agar karakter tidak terlihat berjalan di atas atap.

## Struktur aset
- `public/assets/tilesets/ground_tileset.png` — tileset 7×4, tiap tile 32×32 px.
- `public/assets/tilesets/tile_catalog.json` — nama dan ID masing-masing tile.
- `public/assets/buildings/*.png` — 12 bangunan/gerbang, masing-masing PNG transparan.
- `public/assets/props/*.png` — pohon, semak, bangku, lampu, bendera, papan, lapangan, dan props lain, masing-masing file sendiri.
- `public/assets/maps/school_ground.json` — Tiled JSON dengan layer Ground serta object layers Collision dan Interaction.
- `public/assets/maps/school_objects.json` — penempatan sprite, footpoint, collision, pintu, dan spawn.
- `src/game/scenes/SchoolMapScene.js` — contoh scene Phaser 3 dengan depth sorting dan collision terpisah.

## Cara kerja agar karakter tidak naik ke gedung
1. Ground digambar sebagai Tilemap.
2. Gedung merupakan PNG transparan terpisah, diletakkan pada bottom-center anchor (`origin: 0.5, 1`).
3. Depth gedung mengikuti koordinat Y bagian bawahnya. Karakter di belakang gedung dirender di belakang fasad/atap; karakter di depannya tampil di depan.
4. Collision berupa rectangle terpisah pada footprint/dinding bangunan, bukan pada seluruh gambar atap. Pintu disisakan sebagai interaction zone.
5. Props juga memiliki file sendiri dan diurutkan berdasarkan posisi Y.

## Integrasi
Salin folder `public/assets` ke `public/assets` project kamu. Salin `SchoolMapScene.js` ke project, daftarkan scene di konfigurasi Phaser, lalu ganti kotak kuning placeholder dengan sprite karakter dari Character Selector. Scene memakai Arcade Physics dan kontrol WASD/panah; tombol E mengirim event `school-interaction`.

## Catatan
Ini adalah starter modular pack. Collision footprint dan posisi masih perlu diuji/dituning terhadap ukuran karakter serta skala kamera project asli. Interior gedung belum disertakan; interaction zones sudah disediakan untuk diarahkan ke scene interior.
