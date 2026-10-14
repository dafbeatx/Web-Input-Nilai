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
