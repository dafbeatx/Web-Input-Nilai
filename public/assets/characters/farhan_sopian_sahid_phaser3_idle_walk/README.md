# Farhan Sopian Sahid - Phaser 3 Character Assets

Karakter: Farhan Sopian Sahid, S.Pd.I. (Kepala Sekolah)

## Isi
- 16 frame Idle (Diam): 4 arah x 4 frame.
- 16 frame Walk (Berjalan): 4 arah x 4 frame.
- Total: 32 PNG individual.
- Setiap frame: 64 x 64 px, PNG RGBA transparan.

## Penamaan file
`{mode}_{direction}_{frame}.png`

Mode:
- `idle`: pose diam
- `walk`: pose berjalan

Arah:
- `down`: menghadap depan/bawah
- `right`: menghadap kanan
- `left`: menghadap kiri
- `up`: menghadap belakang/atas

Contoh:
- `idle_down_1.png`
- `walk_left_3.png`

## Catatan Phaser 3
Load setiap PNG sebagai texture terpisah atau gabungkan frame menjadi spritesheet menggunakan pipeline aset project.
Gunakan `idle_*` saat pemain tidak bergerak dan `walk_*` saat pemain bergerak.
Frame sumber idle pada beberapa arah memiliki pose yang nyaris sama; dapat digunakan sebagai variasi idle/blink ringan, tetapi animasi idle tidak perlu diputar terlalu cepat.

## Penampilan karakter
- Peci hitam
- Kacamata
- Seragam navy
- Patch bendera Indonesia
- Emblem sekolah
- Kumis dan janggut
