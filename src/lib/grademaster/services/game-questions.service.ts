export interface GameQuestion {
  id: string;
  game_type?: string;
  subject: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit';
  created_at?: string;
}

export const GAME_SUBJECTS = [
  'Matematika',
  'IPA',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama Islam',
  'Pengetahuan Umum'
] as const;

export type GameSubject = typeof GAME_SUBJECTS[number];

export const DEFAULT_GAME_QUESTIONS: GameQuestion[] = [
  // MATEMATIKA
  {
    id: 'math-1',
    game_type: 'chess',
    subject: 'Matematika',
    question: 'Berapakah hasil dari 15 + (4 x 6) - 10?',
    options: ['29', '34', '104', '25'],
    correct_index: 0,
    explanation: 'Dahulukan perkalian: 4 x 6 = 24. Kemudian 15 + 24 - 10 = 29.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-2',
    game_type: 'chess',
    subject: 'Matematika',
    question: 'Sebuah persegi memiliki keliling 48 cm. Berapakah luas persegi tersebut?',
    options: ['120 cm²', '144 cm²', '96 cm²', '196 cm²'],
    correct_index: 1,
    explanation: 'Sisi = 48 / 4 = 12 cm. Luas = 12 x 12 = 144 cm².',
    difficulty: 'Sedang'
  },
  {
    id: 'math-3',
    game_type: 'chess',
    subject: 'Matematika',
    question: 'Jika 3x + 7 = 28, berapakah nilai x?',
    options: ['6', '7', '8', '9'],
    correct_index: 1,
    explanation: '3x = 28 - 7 = 21, maka x = 21 / 3 = 7.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-4',
    game_type: 'chess',
    subject: 'Matematika',
    question: 'Berapakah akar kuadrat dari 625?',
    options: ['15', '20', '25', '35'],
    correct_index: 2,
    explanation: '25 x 25 = 625.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-5',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Dua sudut dalam segitiga bernilai 65° dan 45°. Berapakah besar sudut ketiga?',
    options: ['70°', '80°', '90°', '60°'],
    correct_index: 0,
    explanation: 'Total sudut segitiga adalah 180°. Sudut ketiga = 180° - (65° + 45°) = 70°.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-6',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Berapakah hasil dari 2⁵ - 3²?',
    options: ['14', '23', '25', '7'],
    correct_index: 1,
    explanation: '2⁵ = 32, dan 3² = 9. Maka 32 - 9 = 23.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-7',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Peluang munculnya angka genap pada pelemparan satu buah dadu bersisi 6 adalah?',
    options: ['1/6', '1/3', '1/2', '2/3'],
    correct_index: 2,
    explanation: 'Angka genap pada dadu adalah {2, 4, 6} (3 mata dadu). Peluang = 3/6 = 1/2.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-8',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Sebuah kubus memiliki rusuk sepanjang 6 cm. Berapakah volume kubus tersebut?',
    options: ['36 cm³', '144 cm³', '216 cm³', '256 cm³'],
    correct_index: 2,
    explanation: 'Volume kubus = s³ = 6 x 6 x 6 = 216 cm³.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-9',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Berapakah gradien dari persamaan garis lurus y = 4x - 9?',
    options: ['-9', '4', '-4', '9'],
    correct_index: 1,
    explanation: 'Bentuk umum y = mx + c memiliki gradien m. Pada y = 4x - 9, m = 4.',
    difficulty: 'Mudah'
  },
  {
    id: 'math-10',
    game_type: 'quiz',
    subject: 'Matematika',
    question: 'Rata-rata dari nilai 7, 8, 9, 6, dan 10 adalah?',
    options: ['7,5', '8,0', '8,5', '7,0'],
    correct_index: 1,
    explanation: 'Jumlah nilai = 7 + 8 + 9 + 6 + 10 = 40. Rata-rata = 40 / 5 = 8,0.',
    difficulty: 'Mudah'
  },

  // IPA
  {
    id: 'ipa-1',
    game_type: 'chess',
    subject: 'IPA',
    question: 'Organel sel yang berfungsi sebagai tempat penghasil energi (ATP) adalah?',
    options: ['Ribosom', 'Mitokondria', 'Badan Golgi', 'Nukleus'],
    correct_index: 1,
    explanation: 'Mitokondria dikenal sebagai powerhouse of cell penghasil energi respirasi seluler.',
    difficulty: 'Sedang'
  },
  {
    id: 'ipa-2',
    game_type: 'chess',
    subject: 'IPA',
    question: 'Hukum Newton II menyatakan bahwa percepatan benda sebanding dengan?',
    options: ['Gaya total dan berbanding terbalik dengan massa', 'Massa dan berbanding terbalik dengan gaya', 'Kecepatan benda saja', 'Gesekan udara'],
    correct_index: 0,
    explanation: 'Rumus Hukum Newton II adalah F = m x a, sehingga a = F / m.',
    difficulty: 'Sedang'
  },
  {
    id: 'ipa-3',
    game_type: 'chess',
    subject: 'IPA',
    question: 'Proses perubahan wujud zat dari padat langsung menjadi gas disebut?',
    options: ['Menguap', 'Mencair', 'Menyublim', 'Mengembun'],
    correct_index: 2,
    explanation: 'Menyublim adalah perubahan wujud dari padat langsung menjadi gas, contohnya kapur barus.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-4',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Pembuluh darah utama yang mengalirkan darah kaya oksigen dari jantung ke seluruh tubuh adalah?',
    options: ['Vena kava', 'Aorta', 'Arteri pulmonalis', 'Vena pulmonalis'],
    correct_index: 1,
    explanation: 'Aorta adalah arteri terbesar yang membawa darah bersih dari bilik kiri jantung ke seluruh tubuh.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-5',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Hubungan simbiosis antara alga dan jamur yang membentuk lumut kerak (liken) adalah contoh simbiosis?',
    options: ['Parasitisme', 'Komensalisme', 'Mutualisme', 'Amensalisme'],
    correct_index: 2,
    explanation: 'Alga menyediakan nutrisi fotosintesis dan jamur menyediakan air serta perlindungan.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-6',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Satuan standar internasional (SI) untuk mengukur kuat arus listrik adalah?',
    options: ['Volt', 'Ohm', 'Watt', 'Ampere'],
    correct_index: 3,
    explanation: 'Ampere (A) adalah satuan dasar SI untuk besaran kuat arus listrik.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-7',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Enzim yang dihasilkan oleh lambung manusia untuk mengubah protein menjadi pepton adalah?',
    options: ['Ptialin', 'Pepsin', 'Amilase', 'Lipase'],
    correct_index: 1,
    explanation: 'Pepsin disekresikan lambung dalam bentuk pepsinogen yang diaktifkan oleh asam klorida (HCl).',
    difficulty: 'Sedang'
  },
  {
    id: 'ipa-8',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Gas dengan konsentrasi persentase paling tinggi di atmosfer bumi adalah?',
    options: ['Oksigen (O₂)', 'Nitrogen (N₂)', 'Karbon Dioksida (CO₂)', 'Argon (Ar)'],
    correct_index: 1,
    explanation: 'Nitrogen mencakup sekitar 78% dari total volume atmosfer bumi.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-9',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Planet dalam tata surya kita yang memiliki jarak orbit paling dekat dengan Matahari adalah?',
    options: ['Venus', 'Merkurius', 'Mars', 'Bumi'],
    correct_index: 1,
    explanation: 'Merkurius adalah planet terdekat dari Matahari dengan jarak rata-rata sekitar 57,9 juta km.',
    difficulty: 'Mudah'
  },
  {
    id: 'ipa-10',
    game_type: 'quiz',
    subject: 'IPA',
    question: 'Jika sebuah mobil menempuh jarak 120 km dalam waktu 2 jam, berapakah kecepatan rata-ratanya?',
    options: ['40 km/jam', '50 km/jam', '60 km/jam', '80 km/jam'],
    correct_index: 2,
    explanation: 'Kecepatan v = s / t = 120 km / 2 jam = 60 km/jam.',
    difficulty: 'Mudah'
  },

  // BAHASA INDONESIA
  {
    id: 'bind-1',
    game_type: 'chess',
    subject: 'Bahasa Indonesia',
    question: 'Ide pokok atau gagasan utama yang menjadi dasar pengembangan paragraf disebut?',
    options: ['Kalimat penjelas', 'Pikiran utama (gagasan pokok)', 'Kata kunci', 'Kesimpulan akhir'],
    correct_index: 1,
    explanation: 'Gagasan pokok atau ide pokok merupakan inti informasi yang mendasari sebuah paragraf.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-2',
    game_type: 'chess',
    subject: 'Bahasa Indonesia',
    question: 'Penulisan kata baku yang tepat di bawah ini adalah?',
    options: ['Apotik, praktek, ijin', 'Apotek, praktik, izin', 'Apotik, praktik, izin', 'Apotek, praktek, ijin'],
    correct_index: 1,
    explanation: 'Sesuai KBBI, bentuk baku adalah apotek, praktik, dan izin.',
    difficulty: 'Sedang'
  },
  {
    id: 'bind-3',
    game_type: 'chess',
    subject: 'Bahasa Indonesia',
    question: 'Majas yang membandingkan benda mati seolah-olah memiliki sifat hidup disebut?',
    options: ['Metafora', 'Hiperbola', 'Personifikasi', 'Litotes'],
    correct_index: 2,
    explanation: 'Personifikasi memberikan sifat insani kepada benda yang tidak bernyawa.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-4',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Sinonim yang paling tepat untuk kata "ADAPTASI" adalah?',
    options: ['Penolakan', 'Penyesuaian', 'Perubahan drastis', 'Pertukaran'],
    correct_index: 1,
    explanation: 'Adaptasi bermakna penyesuaian diri terhadap lingkungan atau situasi baru.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-5',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Antonim atau lawan kata dari "STATIS" adalah?',
    options: ['Pasif', 'Dinamis', 'Konstan', 'Tetap'],
    correct_index: 1,
    explanation: 'Statis berarti diam tidak bergerak, lawannya adalah dinamis yang berarti terus bergerak berkembang.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-6',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Kalimat yang disusun berdasarkan kaidah tata bahasa yang berlaku serta hemat kata disebut?',
    options: ['Kalimat majemuk', 'Kalimat langsung', 'Kalimat efektif', 'Kalimat retoris'],
    correct_index: 2,
    explanation: 'Kalimat efektif menyampaikan informasi secara tepat, padat, dan mudah dipahami tanpa pemborosan kata.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-7',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Teks yang menyajikan cerita atau peristiwa secara runtut menurut urutan waktu disebut teks?',
    options: ['Eksposisi', 'Deskripsi', 'Narasi', 'Persuasi'],
    correct_index: 2,
    explanation: 'Teks narasi berisi rangkaian peristiwa yang disusun secara kronologis.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-8',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Konjungsi yang menyatakan hubungan pertentangan antarklausa di bawah ini adalah?',
    options: ['Dan', 'Tetapi', 'Sehingga', 'Karena'],
    correct_index: 1,
    explanation: 'Konjungsi "tetapi", "namun", dan "melainkan" menyatakan pertentangan.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-9',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Unsur intrinsik karya sastra yang menggambarkan tempat, waktu, dan suasana terjadinya cerita adalah?',
    options: ['Alur', 'Latar (setting)', 'Tema', 'Amanat'],
    correct_index: 1,
    explanation: 'Latar mencakup waktu, tempat, dan suasana lingkungan jalannya cerita.',
    difficulty: 'Mudah'
  },
  {
    id: 'bind-10',
    game_type: 'quiz',
    subject: 'Bahasa Indonesia',
    question: 'Ciri khas pola rima akhir pada bait pantun klasik empat baris adalah?',
    options: ['a-a-a-a', 'a-b-a-b', 'a-a-b-b', 'a-b-b-a'],
    correct_index: 1,
    explanation: 'Pantun klasik berpola persajakan akhir bersilang a-b-a-b.',
    difficulty: 'Mudah'
  },

  // BAHASA INGGRIS
  {
    id: 'bing-1',
    game_type: 'chess',
    subject: 'Bahasa Inggris',
    question: 'She _____ to school every day by bicycle.',
    options: ['go', 'goes', 'going', 'went'],
    correct_index: 1,
    explanation: 'Simple present tense untuk subjek orang ketiga tunggal (She) menggunakan kata kerja + es (goes).',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-2',
    game_type: 'chess',
    subject: 'Bahasa Inggris',
    question: 'What is the synonym of the word "ENORMOUS"?',
    options: ['Tiny', 'Huge', 'Fragile', 'Fast'],
    correct_index: 1,
    explanation: 'Enormous bermakna sangat besar, bersinonim dengan huge.',
    difficulty: 'Sedang'
  },
  {
    id: 'bing-3',
    game_type: 'chess',
    subject: 'Bahasa Inggris',
    question: 'If it rains tomorrow, we _____ stay at home.',
    options: ['would', 'will', 'had', 'are'],
    correct_index: 1,
    explanation: 'Conditional sentence type 1 menggunakan pola: If + simple present, will + infinitive.',
    difficulty: 'Sedang'
  },
  {
    id: 'bing-4',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: 'What is the past tense form of the verb "WRITE"?',
    options: ['Writed', 'Wrote', 'Written', 'Writing'],
    correct_index: 1,
    explanation: 'Bentuk lampau (V2) dari kata kerja tidak beraturan "write" adalah "wrote".',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-5',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: 'The antonym of the word "GENEROUS" is?',
    options: ['Selfish', 'Polite', 'Brave', 'Honest'],
    correct_index: 0,
    explanation: 'Generous berarti dermawan/murah hati, kebalikannya adalah selfish (egois/kikir).',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-6',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: '"They _____ playing basketball in the yard when it started to rain."',
    options: ['was', 'were', 'is', 'are'],
    correct_index: 1,
    explanation: 'Subjek jamak "They" dalam past continuous tense menggunakan to be "were".',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-7',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: 'Which of the following words functions as an ADJECTIVE?',
    options: ['Quickly', 'Beautiful', 'Happiness', 'Sing'],
    correct_index: 1,
    explanation: '"Beautiful" adalah kata sifat (adjective) yang menerangkan kata benda.',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-8',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: 'What is the superlative degree of the adjective "GOOD"?',
    options: ['Better', 'Goodest', 'Best', 'More good'],
    correct_index: 2,
    explanation: 'Tingkatan perbandingan: Good (positive) -> Better (comparative) -> Best (superlative).',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-9',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: 'A person who cures sick people in a hospital is a?',
    options: ['Pilot', 'Doctor', 'Teacher', 'Architect'],
    correct_index: 1,
    explanation: 'A doctor treats and cures sick patients.',
    difficulty: 'Mudah'
  },
  {
    id: 'bing-10',
    game_type: 'quiz',
    subject: 'Bahasa Inggris',
    question: '"Look at those heavy dark clouds! It _____ rain soon."',
    options: ['is going to', 'was', 'did', 'has'],
    correct_index: 0,
    explanation: '"Be going to" digunakan untuk prediksi di masa depan yang memiliki bukti nyata saat ini.',
    difficulty: 'Mudah'
  },

  // PENDIDIKAN AGAMA ISLAM
  {
    id: 'pai-1',
    game_type: 'chess',
    subject: 'Pendidikan Agama Islam',
    question: 'Rukun Iman yang keempat dalam ajaran Islam adalah iman kepada?',
    options: ['Malaikat', 'Kitab-kitab Allah', 'Rasul-rasul Allah', 'Hari Akhir'],
    correct_index: 2,
    explanation: 'Urutan rukun iman: 1. Allah, 2. Malaikat, 3. Kitab, 4. Rasul, 5. Hari Akhir, 6. Qadha & Qadar.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-2',
    game_type: 'chess',
    subject: 'Pendidikan Agama Islam',
    question: 'Hukum bacaan nun mati atau tanwin bertemu huruf Ba (ب) disebut?',
    options: ['Idgham Bighunnah', 'Iqlab', 'Ikhfa Haqiqi', 'Izhar Halqi'],
    correct_index: 1,
    explanation: 'Iqlab terjadi apabila nun sukun atau tanwin bertemu huruf ba, suara nun diganti dengan mim sukun.',
    difficulty: 'Sedang'
  },
  {
    id: 'pai-3',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Sholat sunnah yang dikerjakan sebelum atau sesudah sholat fardhu disebut sholat sunnah?',
    options: ['Dhuha', 'Tahajud', 'Rawatib', 'Istikharah'],
    correct_index: 2,
    explanation: 'Sholat sunnah rawatib adalah sholat yang menyertai sholat wajib lima waktu.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-4',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Gelar yang diberikan kepada Nabi Muhammad SAW karena kejujuran dan amanahnya adalah?',
    options: ['Al-Faruq', 'As-Siddiq', 'Al-Amin', 'Dzulnurain'],
    correct_index: 2,
    explanation: 'Al-Amin berarti orang yang terpercaya, diberikan masyarakat Makkah kepada Nabi Muhammad SAW.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-5',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Kitab suci Zabur diturunkan oleh Allah SWT kepada nabi?',
    options: ['Nabi Musa AS', 'Nabi Daud AS', 'Nabi Isa AS', 'Nabi Ibrahim AS'],
    correct_index: 1,
    explanation: 'Taurat untuk Nabi Musa, Zabur untuk Nabi Daud, Injil untuk Nabi Isa, dan Al-Qur\'an untuk Nabi Muhammad.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-6',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Malaikat yang bertugas membagikan rezeki dan mengatur hujan atas izin Allah adalah?',
    options: ['Jibril', 'Mikail', 'Israfil', 'Izrail'],
    correct_index: 1,
    explanation: 'Malaikat Mikail bertugas mengatur pembagian rezeki dan menurunkan hujan.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-7',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Rukun Islam yang kedua adalah mendirikan?',
    options: ['Syahadat', 'Sholat', 'Zakat', 'Puasa'],
    correct_index: 1,
    explanation: 'Urutan rukun Islam: 1. Syahadat, 2. Sholat, 3. Zakat, 4. Puasa Ramadhan, 5. Haji bagi yang mampu.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-8',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Sikap saling menghormati dan menghargai perbedaan pandangan dalam ajaran Islam disebut?',
    options: ['Tawadhu', 'Tasamuh', 'Tawakal', 'Qanaah'],
    correct_index: 1,
    explanation: 'Tasamuh adalah sikap toleransi dan lapang dada dalam menghadapi perbedaan.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-9',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Zakat yang wajib dikeluarkan setiap Muslim menjelang Hari Raya Idul Fitri adalah zakat?',
    options: ['Mal', 'Fitrah', 'Pertanian', 'Perniagaan'],
    correct_index: 1,
    explanation: 'Zakat fitrah berfungsi mensucikan jiwa orang yang berpuasa dan membantu kaum dhuafa.',
    difficulty: 'Mudah'
  },
  {
    id: 'pai-10',
    game_type: 'quiz',
    subject: 'Pendidikan Agama Islam',
    question: 'Peristiwa perjalanan agung Nabi Muhammad SAW pada malam hari dari Masjidil Haram ke Sidratul Muntaha disebut?',
    options: ['Fathu Makkah', 'Isra Mi\'raj', 'Hijrah ke Madinah', 'Perjanjian Hudaibiyah'],
    correct_index: 1,
    explanation: 'Isra Mi\'raj adalah perjalanan menerima perintah sholat lima waktu.',
    difficulty: 'Mudah'
  },

  // PENGETAHUAN UMUM
  {
    id: 'umum-1',
    game_type: 'chess',
    subject: 'Pengetahuan Umum',
    question: 'Siapakah pencipta lagu kebangsaan Indonesia Raya?',
    options: ['Ismail Marzuki', 'W.R. Soepratman', 'Kusbini', 'C. Simanjuntak'],
    correct_index: 1,
    explanation: 'Lagu kebangsaan Indonesia Raya diciptakan oleh Wage Rudolf Soepratman.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-2',
    game_type: 'chess',
    subject: 'Pengetahuan Umum',
    question: 'Candi Borobudur yang terkenal di Jawa Tengah dibangun pada masa dinasti apa?',
    options: ['Dinasti Sanjaya', 'Dinasti Syailendra', 'Dinasti Majapahit', 'Dinasti Isyana'],
    correct_index: 1,
    explanation: 'Candi Borobudur dibangun pada masa Wangsa Syailendra sekitar abad ke-8 masehi.',
    difficulty: 'Sedang'
  },
  {
    id: 'umum-3',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Ibu Kota Nusantara (IKN) berlokasi di wilayah provinsi?',
    options: ['Kalimantan Barat', 'Kalimantan Timur', 'Kalimantan Selatan', 'Sulawesi Selatan'],
    correct_index: 1,
    explanation: 'IKN Nusantara dibangun di wilayah Kabupaten Penajam Paser Utara dan Kutai Kartanegara, Kalimantan Timur.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-4',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Lagu daerah "Gundul-Gundul Pacul" berasal dari daerah provinsi?',
    options: ['Jawa Barat', 'Jawa Tengah', 'Sumatera Barat', 'Bali'],
    correct_index: 1,
    explanation: 'Lagu "Gundul-Gundul Pacul" adalah lagu dolanan tradisional dari Jawa Tengah karya Sunan Kalijaga.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-5',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Benua dengan luas wilayah daratan terluas di dunia adalah benua?',
    options: ['Afrika', 'Amerika', 'Asia', 'Eropa'],
    correct_index: 2,
    explanation: 'Benua Asia mencakup sekitar 30% dari total luas daratan di planet Bumi.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-6',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Hari Pendidikan Nasional (Hardiknas) di Indonesia diperingati setiap tanggal?',
    options: ['21 April', '2 Mei', '20 Mei', '17 Agustus'],
    correct_index: 1,
    explanation: '2 Mei bertepatan dengan tanggal lahir Ki Hadjar Dewantara, bapak pendidikan nasional.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-7',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Lambang atau simbol pada burung Garuda untuk sila kelima Pancasila adalah?',
    options: ['Bintang Tunggal', 'Rantai Emas', 'Pohon Beringin', 'Padi dan Kapas'],
    correct_index: 3,
    explanation: 'Padi dan Kapas melambangkan keadilan sosial dan kemakmuran bagi seluruh rakyat Indonesia.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-8',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Selat yang menghubungkan Pulau Sumatera dan Pulau Jawa adalah?',
    options: ['Selat Malaka', 'Selat Sunda', 'Selat Bali', 'Selat Makassar'],
    correct_index: 1,
    explanation: 'Selat Sunda memisahkan ujung barat Pulau Jawa dan ujung selatan Pulau Sumatera.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-9',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Tokoh proklamator Indonesia yang dijuluki sebagai "Bapak Koperasi Indonesia" adalah?',
    options: ['Ir. Soekarno', 'Drs. Mohammad Hatta', 'Sutan Sjahrir', 'Ki Hajar Dewantara'],
    correct_index: 1,
    explanation: 'Mohammad Hatta memperjuangkan ekonomi kerakyatan melalui koperasi.',
    difficulty: 'Mudah'
  },
  {
    id: 'umum-10',
    game_type: 'quiz',
    subject: 'Pengetahuan Umum',
    question: 'Samudra terluas dan terdalam di muka bumi adalah Samudra?',
    options: ['Atlantik', 'Hindia', 'Pasifik', 'Arktik'],
    correct_index: 2,
    explanation: 'Samudra Pasifik mencakup lebih dari sepertiga total permukaan bumi.',
    difficulty: 'Mudah'
  }
];

const LOCAL_STORAGE_KEY = 'gm_game_questions_store_v1';

export const GameQuestionsService = {
  getStoredQuestions(): GameQuestion[] {
    if (typeof window === 'undefined') return DEFAULT_GAME_QUESTIONS;
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((q: GameQuestion) => q.id));
          const missingDefaults = DEFAULT_GAME_QUESTIONS.filter(q => !existingIds.has(q.id));
          if (missingDefaults.length > 0) {
            const merged = [...parsed, ...missingDefaults];
            this.saveStoredQuestions(merged);
            return merged;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[GameQuestionsService] Failed reading localStorage:', e);
    }
    // Store defaults if empty
    this.saveStoredQuestions(DEFAULT_GAME_QUESTIONS);
    return DEFAULT_GAME_QUESTIONS;
  },

  saveStoredQuestions(questions: GameQuestion[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(questions));
    } catch (e) {
      console.warn('[GameQuestionsService] Failed saving to localStorage:', e);
    }
  },

  async fetchQuestions(subject?: string): Promise<GameQuestion[]> {
    // Attempt to load from API route first
    try {
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
      const res = await fetch(`/api/grademaster/games/questions${query}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.questions) && json.questions.length > 0) {
          this.saveStoredQuestions(json.questions);
          return json.questions;
        }
      }
    } catch (err) {
      console.warn('[GameQuestionsService] API fetch failed, falling back to local storage:', err);
    }

    const localList = this.getStoredQuestions();
    if (subject) {
      const filtered = localList.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
      return filtered.length > 0 ? filtered : localList;
    }
    return localList;
  },

  async addOrUpdateQuestion(question: GameQuestion): Promise<GameQuestion[]> {
    const questions = this.getStoredQuestions();
    const idx = questions.findIndex(q => q.id === question.id);
    let updated: GameQuestion[];
    if (idx >= 0) {
      updated = [...questions];
      updated[idx] = { ...question, created_at: questions[idx].created_at || new Date().toISOString() };
    } else {
      updated = [
        {
          ...question,
          id: question.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString()
        },
        ...questions
      ];
    }

    this.saveStoredQuestions(updated);

    // Sync to backend asynchronously
    fetch('/api/grademaster/games/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    }).catch(err => console.warn('[GameQuestionsService] Sync to backend failed:', err));

    return updated;
  },

  async deleteQuestion(id: string): Promise<GameQuestion[]> {
    const questions = this.getStoredQuestions();
    const updated = questions.filter(q => q.id !== id);
    this.saveStoredQuestions(updated);

    // Sync deletion to backend
    fetch(`/api/grademaster/games/questions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('[GameQuestionsService] Backend delete failed:', err));

    return updated;
  },

  resetDefaults(): GameQuestion[] {
    this.saveStoredQuestions(DEFAULT_GAME_QUESTIONS);
    return DEFAULT_GAME_QUESTIONS;
  },

  getRandomQuestionForDuel(subject: string, excludeIds: string[] = []): GameQuestion {
    const all = this.getStoredQuestions();
    let candidates = all.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    if (candidates.length === 0) candidates = all;

    const notSeen = candidates.filter(q => !excludeIds.includes(q.id));
    const pool = notSeen.length > 0 ? notSeen : candidates;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex] || DEFAULT_GAME_QUESTIONS[0];
  }
};
