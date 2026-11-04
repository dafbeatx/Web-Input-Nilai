import { NPCConfig, Waypoint } from '../../game/entities/NPC';

export interface StudentProfileData {
  id: string;
  name: string;
  role: string; // e.g. "Siswa Kelas 9B", "Siswi Kelas 9A"
  grade: '7' | '8A' | '8B' | '9A' | '9B';
  gender: 'L' | 'P';
  quote: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. TEACHER & STAFF ROSTER (Unique names from official school database)
// ═════════════════════════════════════════════════════════════════════════════
export const TEACHER_CONFIGS: NPCConfig[] = [
  {
    id: 'npc-satpam',
    name: 'Pak Asep',
    role: 'Keamanan Sekolah',
    characterKey: 'char_satpam',
    avatarUrl: '/assets/game/characters/avatars/pak_joko.png',
    speed: 55,
    waypoints: [
      { x: 730, y: 860, waitTime: 3000 },
      { x: 790, y: 860, waitTime: 3500 },
      { x: 790, y: 910, waitTime: 3000 },
      { x: 730, y: 910, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Pak Asep menyapa Anda dengan senyum ramah di pos gerbang sekolah:',
      quote: '“Selamat pagi! Tetap jaga ketertiban, parkir kendaraan rapi di tempatnya, dan jangan lupa selalu santun kepada bapak/ibu guru ya!”',
    },
  },
  {
    id: 'npc-farhan',
    name: 'Farhan Sopian Sahid',
    role: 'Kepala Sekolah',
    characterKey: 'char_farhan',
    avatarUrl: '/assets/game/characters/avatars/farhan_sopian_sahid.png',
    speed: 50,
    waypoints: [
      { x: 710, y: 265, waitTime: 4000 },
      { x: 810, y: 265, waitTime: 3500 },
      { x: 810, y: 285, waitTime: 3000 },
      { x: 710, y: 285, waitTime: 3000 },
    ],
    dialogue: {
      greeting: 'Bapak Farhan Sopian Sahid (Kepala Sekolah) menyapa Anda dengan senyum berwibawa di halaman administrasi:',
      quote: '“Selamat datang di SMP Terpadu Al-Ittihadiyah! Jadikan setiap hari di sekolah sebagai langkah meraih prestasi, budi pekerti luhur, dan penguasaan sains teknologi.”',
    },
  },
  {
    id: 'npc-pak-dafa',
    name: 'Pak Dafa',
    role: 'Guru Informatika',
    characterKey: 'char_pak_dafa',
    avatarUrl: '/assets/game/characters/avatars/pak_dafa.png',
    speed: 55,
    waypoints: [
      { x: 945, y: 260, waitTime: 3500 },
      { x: 1010, y: 260, waitTime: 3000 },
      { x: 1010, y: 275, waitTime: 3000 },
      { x: 945, y: 275, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Pak Dafa menyapa Anda dengan ramah di selasar Laboratorium Komputer:',
      quote: '“Halo! Lab komputer multimedia dan sistem smart school sudah aktif. Siap belajar coding, eksplorasi AI, dan simulasi interaktif hari ini?”',
    },
  },
  {
    id: 'npc-septi',
    name: 'Bu Septi',
    role: 'Guru B. Indonesia',
    characterKey: 'char_septi',
    avatarUrl: '/assets/game/characters/avatars/septi_nur_aeni.png',
    speed: 55,
    waypoints: [
      { x: 465, y: 150, waitTime: 3500 },
      { x: 515, y: 150, waitTime: 3000 },
      { x: 515, y: 230, waitTime: 3000 },
      { x: 465, y: 230, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Bu Septi tersenyum hangat menyapa Anda sambil membawa buku bahan ajar:',
      quote: '“Assalamu’alaikum! Mari tingkatkan literasi membaca dan penguasaan bahasa Indonesia dengan penuh semangat ya ananda!”',
    },
  },
  {
    id: 'npc-qodi',
    name: 'Pa Qodi',
    role: 'Operator Sekolah',
    characterKey: 'char_pa_qodi',
    avatarUrl: '/assets/game/characters/avatars/pa_qodi.png',
    speed: 55,
    waypoints: [
      { x: 470, y: 75, waitTime: 3500 },
      { x: 515, y: 75, waitTime: 3000 },
      { x: 515, y: 130, waitTime: 3000 },
      { x: 470, y: 130, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Pa Qodi menyapa Anda di depan ruang administrasi dan server data:',
      quote: '“Halo! Data pokok pendidikan, sinkronisasi raport, dan akun smart school semua peserta didik sudah up to date. Semangat belajar ya!”',
    },
  },
  {
    id: 'npc-fitri',
    name: 'Bu Fitri',
    role: 'Guru Matematika',
    characterKey: 'char_bu_fitri',
    avatarUrl: '/assets/game/characters/avatars/bu_fitri.png',
    speed: 55,
    waypoints: [
      { x: 920, y: 665, waitTime: 3500 },
      { x: 1020, y: 665, waitTime: 3000 },
      { x: 1020, y: 685, waitTime: 3000 },
      { x: 920, y: 685, waitTime: 2500 },
    ],
    dialogue: {
      greeting: 'Bu Fitri menyapa Anda dengan senyum ramah sambil memegang modul numerasi:',
      quote: '“Assalamu’alaikum! Jangan takut dengan matematika ya. Jika dipahami langkah demi langkah, matematika itu seru dan melatih logika kita!”',
    },
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// 2. 10 DEDICATED SAFE OUTDOOR PATROL ROUTES (Obstacle-Free, Spaced Apart)
// ═════════════════════════════════════════════════════════════════════════════
export const OUTDOOR_PATROL_ROUTES: Record<number, Waypoint[]> = {
  // Slot 0: Lapangan Olahraga / Futsal Court Utara (Flat & Open)
  0: [
    { x: 620, y: 665, waitTime: 2500 },
    { x: 730, y: 665, waitTime: 2000 },
    { x: 810, y: 665, waitTime: 2500 },
    { x: 730, y: 665, waitTime: 2000 },
  ],
  // Slot 1: Lapangan Olahraga / Futsal Court Selatan (Separated from Slot 0)
  1: [
    { x: 620, y: 750, waitTime: 2500 },
    { x: 730, y: 750, waitTime: 2000 },
    { x: 810, y: 750, waitTime: 2500 },
    { x: 730, y: 750, waitTime: 2000 },
  ],
  // Slot 2: Pelataran Olahraga Timur (Dekat Lapangan Futsal Timur)
  2: [
    { x: 910, y: 700, waitTime: 3000 },
    { x: 1040, y: 700, waitTime: 2500 },
    { x: 1040, y: 740, waitTime: 3000 },
    { x: 910, y: 740, waitTime: 2500 },
  ],
  // Slot 3: Pelataran Tiang Bendera Barat (Paved stone plaza)
  3: [
    { x: 680, y: 340, waitTime: 3000 },
    { x: 710, y: 380, waitTime: 2500 },
    { x: 680, y: 420, waitTime: 3000 },
    { x: 680, y: 360, waitTime: 2500 },
  ],
  // Slot 4: Pelataran Tiang Bendera Timur (Paved stone plaza)
  4: [
    { x: 830, y: 340, waitTime: 3000 },
    { x: 810, y: 380, waitTime: 2500 },
    { x: 830, y: 420, waitTime: 3000 },
    { x: 830, y: 360, waitTime: 2500 },
  ],
  // Slot 5: Pelataran Tiang Bendera Utara
  5: [
    { x: 730, y: 335, waitTime: 3000 },
    { x: 790, y: 335, waitTime: 2500 },
    { x: 790, y: 365, waitTime: 3000 },
    { x: 730, y: 365, waitTime: 2500 },
  ],
  // Slot 6: Gerbang Utama / Pos Satpam Depan
  6: [
    { x: 735, y: 840, waitTime: 3500 },
    { x: 785, y: 840, waitTime: 2500 },
    { x: 785, y: 890, waitTime: 3500 },
    { x: 735, y: 890, waitTime: 2500 },
  ],
  // Slot 7: Koridor Barat Taman Depan Kelas
  7: [
    { x: 470, y: 250, waitTime: 3000 },
    { x: 530, y: 250, waitTime: 2500 },
    { x: 530, y: 270, waitTime: 3000 },
    { x: 470, y: 270, waitTime: 2500 },
  ],
  // Slot 8: Selasar Luar Perpustakaan & Gazebo Literasi
  8: [
    { x: 1140, y: 625, waitTime: 3500 },
    { x: 1300, y: 625, waitTime: 3000 },
    { x: 1420, y: 625, waitTime: 3500 },
    { x: 1250, y: 625, waitTime: 2500 },
  ],
  // Slot 9: Koridor Pusat Penghubung Gedung Kantor & Tiang Bendera
  9: [
    { x: 710, y: 295, waitTime: 3000 },
    { x: 810, y: 295, waitTime: 2500 },
    { x: 810, y: 315, waitTime: 3000 },
    { x: 710, y: 315, waitTime: 2500 },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. AUTHENTIC STUDENT ROTATION POOLS (Sourced from Real Database)
//    Organized into 30-minute shifts: exactly 10 students per shift.
// ═════════════════════════════════════════════════════════════════════════════
export const STUDENT_BATCHES: StudentProfileData[][] = [
  // ── SHIFT A (10 Students) ──
  [
    {
      id: 'std-akbar',
      name: 'Akbar Azhi Mughni',
      role: 'Siswa Kelas 7',
      grade: '7',
      gender: 'L',
      quote: '“Alhamdulillah sudah mulai terbiasa dengan jadwal pelajaran di SMP Al-Ittihadiyah. Teman-teman sekelas sangat kompak!”',
    },
    {
      id: 'std-kinara',
      name: 'Kinara Azzahra',
      role: 'Siswi Kelas 7',
      grade: '7',
      gender: 'P',
      quote: '“Tadi habis mengumpulkan tugas IPA di ruang guru. Suasana sekolah di taman ini sejuk sekali ya!”',
    },
    {
      id: 'std-romadona',
      name: 'Romadona',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Saya sedang jalan santai ke kantin membeli bekal air minum. Nanti siang ada praktikum di lab komputer.”',
    },
    {
      id: 'std-tasyira',
      name: 'Tasyira Afifa',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Kelompok kami di kelas 8A sedang merancang poster proyek P5 tentang pelestarian lingkungan kampus.”',
    },
    {
      id: 'std-faqih',
      name: 'Faqih Sirojul Mukti',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Habis olahraga lari keliling lapangan futsal sama teman-teman 8B. Badan jadi bugar dan segar!”',
    },
    {
      id: 'std-romadoni',
      name: 'Romadoni',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Nanti sehabis sholat zuhur berjamaah di musala, kami mau latihan futsal antar kelas.”',
    },
    {
      id: 'std-ajeng',
      name: 'Ajeng Alifatul Khoir',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Assalamu’alaikum! Saya baru saja dari perpustakaan meminjam referensi materi asesmen kelas 9A. Semangat belajar ya!”',
    },
    {
      id: 'std-putri-hafsoh',
      name: 'Putri Hafsoh Rabani',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Di kelas 9 kami fokus penguatan materi dan bimbingan karir. Semoga ujian sumatif akhir berjalan lancar.”',
    },
    {
      id: 'std-sonaji',
      name: 'Sonaji',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Eh halo! Nanti sehabis jam pelajaran ada kerja kelompok proyek kelas 9B di lab multimedia, gabung yuk!”',
    },
    {
      id: 'std-fairuz',
      name: 'Fairuz Prasetia',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Halo kawan! Mari selalu jaga kebersihan koridor dan buang sampah pada tempatnya ya.”',
    },
  ],

  // ── SHIFT B (10 Students) ──
  [
    {
      id: 'std-ridwan',
      name: 'Muhamad Ridwan Aulah',
      role: 'Siswa Kelas 7',
      grade: '7',
      gender: 'L',
      quote: '“Guru-guru di SMP Al-Ittihadiyah sangat ramah dan sabar menerangkan materi pelajaran!”',
    },
    {
      id: 'std-delisa',
      name: 'Delisa Qeren Surfina',
      role: 'Siswi Kelas 7',
      grade: '7',
      gender: 'P',
      quote: '“Menikmati jam istirahat di gazebo taman sekolah sambil membaca buku cerita literasi.”',
    },
    {
      id: 'std-yuna',
      name: 'Yuna Handayani',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Tadi baru saja selesai penilaian harian matematika bersama Bu Fitri di ruang kelas 8.”',
    },
    {
      id: 'std-kirana',
      name: 'Kirana Aura Anwarudin',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Mari saling mengingatkan untuk berwudu lebih awal sebelum azan zuhur berkumandang!”',
    },
    {
      id: 'std-firdaus',
      name: 'Muhamad Firdaus Akbar',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Lapangan futsal sekolah kita rumputnya bagus dan luas, seru banget buat olahraga pagi!”',
    },
    {
      id: 'std-adrian',
      name: 'Adrian Putra Nugraha',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Kelas 8B lagi kompak mempersiapkan pertandingan persahabatan antar kelas pekan depan.”',
    },
    {
      id: 'std-sifa',
      name: 'Sifa Nurkhalifah',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Waktu istirahat 30 menit ini cukup buat menyegarkan pikiran sebelum masuk sesi pendalaman materi.”',
    },
    {
      id: 'std-salwa',
      name: 'Salwa Naylatul Putri',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Buku-buku ensiklopedia di perpustakaan lengkap banget, banyak referensi sains yang menarik!”',
    },
    {
      id: 'std-nazrul',
      name: 'Nazrul Ilham',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Pak Dafa tadi mendemokan cara membuat aplikasi web sederhana di lab komputer, seru sekali!”',
    },
    {
      id: 'std-syahrul',
      name: 'Muhammad Syahrul Adi Putra',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Tetap semangat menuntut ilmu! Jangan malas membaca buku dan bertanya kalau belum paham materi.”',
    },
  ],

  // ── SHIFT C (10 Students) ──
  [
    {
      id: 'std-hanifah',
      name: 'Hanifah Al-Qusyari',
      role: 'Siswa Kelas 7',
      grade: '7',
      gender: 'L',
      quote: '“Bangga bisa bersekolah di kampus asri SMP Al-Ittihadiyah yang bernuansa Islami dan modern.”',
    },
    {
      id: 'std-hilya',
      name: 'Hilya Himmatul Aliyah',
      role: 'Siswi Kelas 7',
      grade: '7',
      gender: 'P',
      quote: '“Taman di sekitar tiang bendera bersih dan terawat sekali ya. Senang melihatnya!”',
    },
    {
      id: 'std-bilqis',
      name: 'Bilqis Ainun Nissa',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Kantin sekolah kejujuran mengajarkan kita untuk selalu berakhlak mulia dan jujur kapan saja.”',
    },
    {
      id: 'std-amanda',
      name: 'Amanda Hasna Mirza',
      role: 'Siswi Kelas 8A',
      grade: '8A',
      gender: 'P',
      quote: '“Diskusi kelompok di gazebo taman rasanya lebih nyaman dan ide-ide kreatif gampang mengalir.”',
    },
    {
      id: 'std-syahrul-f',
      name: 'Syahrul Faujan',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Ayo jaga kesehatan dan kebugaran tubuh dengan rutin berolahraga dan minum air putih yang cukup!”',
    },
    {
      id: 'std-fauzi',
      name: 'Fauzi Fadilah',
      role: 'Siswa Kelas 8B',
      grade: '8B',
      gender: 'L',
      quote: '“Selasar depan kelas bersih, belajar jadi tambah betah dan fokus menyimak pelajaran bapak/ibu guru.”',
    },
    {
      id: 'std-azzahra',
      name: 'Azzahra Ashila Rohmah',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Kami kelas 9 saling membantu belajar bersama kalau ada materi ujian yang cukup menantang.”',
    },
    {
      id: 'std-nenden',
      name: 'Nenden Sekar Arum',
      role: 'Siswi Kelas 9A',
      grade: '9A',
      gender: 'P',
      quote: '“Mari gunakan waktu istirahat sebaik-baiknya sebelum bel masuk kelas berikutnya berbunyi!”',
    },
    {
      id: 'std-ariiq',
      name: 'Ariiq Safwaan Al Barra',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Lab komputer sekolah kece badai, komputernya kencang dan koneksi internetnya stabil banget!”',
    },
    {
      id: 'std-wildan',
      name: 'Wildan Khoer Basuki',
      role: 'Siswa Kelas 9B',
      grade: '9B',
      gender: 'L',
      quote: '“Selalu hormati bapak ibu guru dan jaga nama baik sekolah SMP Al-Ittihadiyah di mana pun kita berada.”',
    },
  ],
];

/**
 * Returns the current 30-minute shift index based on real-time clock or in-game timer.
 * Rotates smoothly at :00 and :30 of every hour.
 */
export function getCurrentShiftIndex(referenceTimeMs: number = Date.now()): number {
  const thirtyMinutesMs = 30 * 60 * 1000;
  return Math.floor(referenceTimeMs / thirtyMinutesMs) % STUDENT_BATCHES.length;
}

/**
 * Generates the full 10-student NPCConfig array for the given shift.
 * Each student is mapped to one of the 10 dedicated, safe, non-overlapping outdoor patrol routes.
 */
export function getActiveStudentNPCConfigs(shiftIndex: number): NPCConfig[] {
  const batch = STUDENT_BATCHES[shiftIndex % STUDENT_BATCHES.length];

  return batch.map((student, slotIndex) => {
    const waypoints = OUTDOOR_PATROL_ROUTES[slotIndex] ?? [
      { x: 740, y: 700 + slotIndex * 15, waitTime: 2500 },
      { x: 780, y: 700 + slotIndex * 15, waitTime: 2500 },
    ];

    const characterKey = student.gender === 'P' ? 'char_siswi_hijab' : 'char_student';
    const avatarUrl =
      student.gender === 'P'
        ? '/assets/game/characters/avatars/aisyah_putri.png'
        : '/assets/game/characters/avatars/rian_pratama.png';

    return {
      id: student.id,
      name: student.name,
      role: student.role,
      characterKey,
      avatarUrl,
      speed: 60,
      waypoints,
      dialogue: {
        greeting: `${student.name} (${student.role}) menyapa Anda dengan ramah di halaman sekolah:`,
        quote: student.quote,
      },
    };
  });
}
