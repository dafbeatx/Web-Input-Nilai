/**
 * Deterministic answer key parser.
 * Supports:
 *   "1.A 2.B 3.C"
 *   "A B C D"
 *   "ABCDABCD"
 *   "A, B, C, D"
 *   "1) A  2) B  3) C"
 *   "1.A2.B3.C"
 *
 * Output: string[] — e.g. ["A","B","C","D"]
 */

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

export function parseAnswerKey(input: string): string[] {
  if (!input || !input.trim()) return [];

  const normalized = input
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();

  // Strategy 1: Numbered format — "1.A 2.B" or "1)A 2)B" or "1:A" or "1-A" or "1. A"
  const numberedPattern = /(\d+)\s*[.:\-)\s]\s*([A-Da-d])/g;
  const numberedMatches: { num: number; ans: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = numberedPattern.exec(normalized)) !== null) {
    const num = parseInt(match[1]);
    const ans = match[2].toUpperCase();
    if (VALID_OPTIONS.has(ans)) {
      numberedMatches.push({ num, ans });
    }
  }

  if (numberedMatches.length > 0) {
    numberedMatches.sort((a, b) => a.num - b.num);
    const result: string[] = [];
    for (const m of numberedMatches) {
      result[m.num - 1] = m.ans;
    }
    // Fill gaps with empty string if sequential gaps exist
    for (let i = 0; i < result.length; i++) {
      if (!result[i]) result[i] = '';
    }
    return result.filter(Boolean);
  }

  // Strategy 2: Separated letters — "A B C D" or "A, B, C, D" or "A;B;C;D"
  const separatedPattern = /^[A-Da-d](\s*[,;\s]\s*[A-Da-d])+$/;
  const cleanedForSep = normalized.replace(/[^A-Da-d,;\s]/g, '').trim();

  if (separatedPattern.test(cleanedForSep)) {
    const letters = cleanedForSep
      .split(/[,;\s]+/)
      .map(l => l.trim().toUpperCase())
      .filter(l => VALID_OPTIONS.has(l));
    if (letters.length > 0) return letters;
  }

  // Strategy 3: Continuous string — "ABCDABCD"
  const onlyLetters = normalized.toUpperCase().replace(/[^A-D]/g, '');
  if (onlyLetters.length > 0 && onlyLetters.length === normalized.replace(/\s/g, '').length) {
    return onlyLetters.split('');
  }

  // Strategy 4: Fallback — extract all valid A-D letters in order
  const fallback = normalized.toUpperCase().replace(/[^A-D]/g, '');
  if (fallback.length > 0) {
    return fallback.split('');
  }

  return [];
}

/**
 * Convert legacy Record<number, string> format to string[]
 */
export function legacyKeyToArray(legacy: Record<number, string>): string[] {
  const entries = Object.entries(legacy)
    .map(([k, v]) => ({ num: parseInt(k), ans: v }))
    .sort((a, b) => a.num - b.num);

  const result: string[] = [];
  for (const e of entries) {
    result[e.num - 1] = e.ans;
  }
  return result;
}

/**
 * Convert string[] to Record<number, string> for backward compatibility
 */
export function arrayToLegacyKey(arr: string[]): Record<number, string> {
  const result: Record<number, string> = {};
  arr.forEach((ans, idx) => {
    if (ans) result[idx + 1] = ans;
  });
  return result;
}
