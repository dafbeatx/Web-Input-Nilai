import stringSimilarity from 'string-similarity';

// Indonesian stopwords for keyword extraction
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'pada',
  'adalah', 'sebagai', 'dalam', 'tidak', 'akan', 'juga', 'atau', 'ada', 'mereka',
  'sudah', 'saya', 'seperti', 'bisa', 'hanya', 'oleh', 'telah', 'saat', 'secara',
  'karena', 'dapat', 'hal', 'sehingga', 'antara', 'sebuah', 'setelah', 'ia', 'serta',
  'banyak', 'tentang', 'beberapa', 'bahwa', 'suatu', 'namun', 'masih', 'pun', 'maka',
  'agar', 'sedangkan', 'tanpa', 'jika', 'tersebut', 'lain', 'ketika', 'atas',
  'the', 'is', 'are', 'was', 'were', 'a', 'an', 'of', 'in', 'to', 'for', 'and',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'or',
]);

// Common synonym pairs for educational domain
const SYNONYMS: Record<string, string[]> = {
  'internet': ['jaringan', 'network', 'web', 'online'],
  'komputer': ['pc', 'laptop', 'computer', 'perangkat'],
  'perangkat lunak': ['software', 'aplikasi', 'program'],
  'perangkat keras': ['hardware'],
  'basis data': ['database', 'db'],
  'algoritma': ['algoritme', 'langkah-langkah'],
  'fungsi': ['function', 'method', 'prosedur'],
  'variabel': ['variable', 'var'],
  'proses': ['processing', 'memproses', 'pengolahan'],
  'data': ['informasi', 'info'],
  'sistem': ['system'],
  'jaringan': ['network', 'internet', 'lan', 'wan'],
  'operasi': ['operation', 'os'],
  'input': ['masukan', 'masuk'],
  'output': ['keluaran', 'keluar', 'hasil'],
  'memori': ['memory', 'ram', 'penyimpanan'],
  'penyimpanan': ['storage', 'disk', 'memori'],
  'server': ['peladen'],
  'client': ['klien'],
  'protokol': ['protocol', 'aturan'],
  'topologi': ['topology', 'arsitektur'],
  'enkripsi': ['encryption', 'penyandian'],
  'dekripsi': ['decryption'],
};

export interface EssayScoreDetail {
  questionIndex: number;
  diceScore: number;
  keywordScore: number;
  ngramScore: number;
  weightedScore: number;
  matchedKeywords: string[];
  totalKeywords: number;
}

export interface EssayScoreResult {
  score: number;
  details: EssayScoreDetail[];
}

// Channel weights
const DICE_WEIGHT = 0.35;
const KEYWORD_WEIGHT = 0.45;
const NGRAM_WEIGHT = 0.20;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(w => w.length > 1);
}

function extractKeywords(text: string): string[] {
  return tokenize(text).filter(w => !STOPWORDS.has(w));
}

// Levenshtein distance (bounded for performance)
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Bail early if length diff too big
  if (Math.abs(a.length - b.length) > 3) return Math.max(a.length, b.length);

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function isSynonym(word: string, target: string): boolean {
  if (word === target) return true;
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    const group = [key, ...synonyms];
    if (group.includes(word) && group.includes(target)) return true;
  }
  return false;
}

function fuzzyMatchKeyword(studentWord: string, keyWord: string, tolerance: number = 2): boolean {
  if (isSynonym(studentWord, keyWord)) return true;
  if (keyWord.length <= 3) return studentWord === keyWord;
  return levenshtein(studentWord, keyWord) <= tolerance;
}

// Channel 1: Dice coefficient (structural similarity)
function scoreDice(studentText: string, keyText: string): number {
  const sim = stringSimilarity.compareTwoStrings(
    normalizeText(studentText),
    normalizeText(keyText)
  );
  return sim * 100;
}

// Channel 2: Keyword hit rate with fuzzy matching
function scoreKeywords(studentText: string, keyText: string): { score: number; matched: string[]; total: number } {
  const keyKeywords = extractKeywords(keyText);
  if (keyKeywords.length === 0) return { score: 0, matched: [], total: 0 };

  const studentTokens = tokenize(studentText);
  const matched: string[] = [];

  for (const kw of keyKeywords) {
    const found = studentTokens.some(st => fuzzyMatchKeyword(st, kw));
    if (found) matched.push(kw);
  }

  // Deduplicate keywords for fair counting
  const uniqueKey = [...new Set(keyKeywords)];
  const uniqueMatched = [...new Set(matched)];
  const hitRate = uniqueKey.length > 0 ? uniqueMatched.length / uniqueKey.length : 0;

  return { score: hitRate * 100, matched: uniqueMatched, total: uniqueKey.length };
}

// Channel 3: N-gram overlap (bigrams + trigrams)
function generateNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function scoreNgrams(studentText: string, keyText: string): number {
  const studentTokens = tokenize(studentText);
  const keyTokens = tokenize(keyText);

  if (keyTokens.length < 2) return scoreDice(studentText, keyText);

  const studentBigrams = generateNgrams(studentTokens, 2);
  const keyBigrams = generateNgrams(keyTokens, 2);

  let overlap = 0;
  for (const ng of keyBigrams) {
    if (studentBigrams.has(ng)) overlap++;
  }

  // Also check trigrams if enough tokens
  let trigramScore = 0;
  if (keyTokens.length >= 3) {
    const studentTrigrams = generateNgrams(studentTokens, 3);
    const keyTrigrams = generateNgrams(keyTokens, 3);
    let triOverlap = 0;
    for (const ng of keyTrigrams) {
      if (studentTrigrams.has(ng)) triOverlap++;
    }
    trigramScore = keyTrigrams.size > 0 ? (triOverlap / keyTrigrams.size) * 100 : 0;
  }

  const bigramScore = keyBigrams.size > 0 ? (overlap / keyBigrams.size) * 100 : 0;
  return keyTokens.length >= 3
    ? (bigramScore * 0.6) + (trigramScore * 0.4)
    : bigramScore;
}

// Map raw weighted score to final grade
function scoreToGrade(rawScore: number): number {
  if (rawScore >= 85) return 100;
  if (rawScore >= 75) return 90;
  if (rawScore >= 65) return 80;
  if (rawScore >= 55) return 70;
  if (rawScore >= 45) return 60;
  if (rawScore >= 35) return 50;
  if (rawScore >= 20) return 40;
  if (rawScore >= 10) return 25;
  return 0;
}

export function calculateHybridEssayScore(
  studentAnswers: string[],
  answerKeys: string[]
): EssayScoreResult {
  if (!answerKeys || answerKeys.length === 0) {
    return { score: 0, details: [] };
  }

  const details: EssayScoreDetail[] = [];

  for (let i = 0; i < answerKeys.length; i++) {
    const studentAns = studentAnswers[i] || '';
    const key = answerKeys[i] || '';

    if (!studentAns.trim() || !key.trim()) {
      details.push({
        questionIndex: i,
        diceScore: 0,
        keywordScore: 0,
        ngramScore: 0,
        weightedScore: 0,
        matchedKeywords: [],
        totalKeywords: extractKeywords(key).length,
      });
      continue;
    }

    const dice = scoreDice(studentAns, key);
    const kw = scoreKeywords(studentAns, key);
    const ngram = scoreNgrams(studentAns, key);

    const rawWeighted = (dice * DICE_WEIGHT) + (kw.score * KEYWORD_WEIGHT) + (ngram * NGRAM_WEIGHT);
    const finalScore = scoreToGrade(rawWeighted);

    details.push({
      questionIndex: i,
      diceScore: Math.round(dice * 100) / 100,
      keywordScore: Math.round(kw.score * 100) / 100,
      ngramScore: Math.round(ngram * 100) / 100,
      weightedScore: finalScore,
      matchedKeywords: kw.matched,
      totalKeywords: kw.total,
    });
  }

  const totalScore = details.length > 0
    ? Math.round(details.reduce((sum, d) => sum + d.weightedScore, 0) / details.length)
    : 0;

  return { score: totalScore, details };
}
