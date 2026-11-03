# School RPG Tilemap - Phaser 3

Paket ini mengubah ilustrasi sekolah 1536×1024 menjadi tilemap orthogonal yang dapat dimuat oleh Phaser 3.

## Isi paket

- `public/assets/maps/school_map.json`: Tiled JSON map, 48×32 tile.
- `public/assets/maps/school_atlas.png`: atlas sumber 1536×1024, dipotong secara logis menjadi tile 32×32.
- `public/assets/characters/*.png`: lima spritesheet karakter 256×256 (frame 64×64).
- `src/game/scenes/SchoolMapScene.js`: scene Phaser dengan kamera, collision object, zona interaksi, kontrol keyboard, kontrol sentuh, dan pergantian karakter tombol 1–5.
- `src/game/main.js`: konfigurasi game demo.

## Jalankan demo

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite.

## Kontrol

- Desktop: WASD atau tombol panah untuk bergerak.
- `E`: interaksi dengan area yang sedang didekati.
- `1` sampai `5`: ganti karakter.
- `F3`: tampilkan/sembunyikan debug collision.
- HP/PID: tombol arah sentuh di kanan bawah dan tombol INTERAKSI di kiri bawah.

## Integrasi ke project Next.js

1. Salin folder `public/assets/maps` ke folder `public/assets/maps` project Next.js.
2. Salin `public/assets/characters` ke `public/assets/characters` project Next.js.
3. Salin `src/game/scenes/SchoolMapScene.js` ke direktori game project.
4. Pastikan dependency `phaser` tersedia.
5. Import dan jalankan scene dari komponen client-only (`'use client'`). Phaser perlu diinisialisasi setelah komponen ter-mount, bukan saat SSR.

Contoh komponen client:

```jsx
'use client';
import { useEffect, useRef } from 'react';

export default function SchoolGame() {
  const hostRef = useRef(null);

  useEffect(() => {
    let game;
    let cancelled = false;
    (async () => {
      const Phaser = (await import('phaser')).default;
      const { default: SchoolMapScene } = await import('@/game/scenes/SchoolMapScene');
      if (cancelled || !hostRef.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: 1024,
        height: 640,
        backgroundColor: '#17251e',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        physics: { default: 'arcade', arcade: { debug: false } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [SchoolMapScene],
      });
    })();
    return () => { cancelled = true; game?.destroy(true); };
  }, []);

  return <div ref={hostRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
```

Sesuaikan alias `@/game` dengan konfigurasi project kamu.

## Catatan penting tentang konversi

Gambar sumber adalah satu ilustrasi raster utuh, bukan kumpulan tile modular. Untuk mempertahankan tampilannya secara akurat, atlas dibuat dari grid koordinat gambar yang sama: 48 kolom × 32 baris, setiap tile 32×32. Dengan demikian peta valid sebagai tilemap Phaser/Tiled dan bisa memakai object layer, collision, serta interaction zone. Namun setiap tile pada atlas ini unik berdasarkan posisi; belum merupakan tileset modular yang bisa dipakai ulang untuk menggambar sekolah baru.

Collision dan zona interaksi adalah perkiraan awal berbentuk rectangle yang dibuat manual mengikuti posisi bangunan pada ilustrasi. Tekan F3 saat demo untuk memeriksa collision. Sesuaikan koordinat di layer `Collision` dan `Interact` pada `school_map.json` sesuai hasil uji permainan.

Bangunan masih berupa tampilan eksterior pada satu gambar. Zona interaksi hanya memicu event `school-interact`; interior ruangan perlu dibuat sebagai map/scene terpisah.
