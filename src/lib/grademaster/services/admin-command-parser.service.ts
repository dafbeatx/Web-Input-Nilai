type AdminAction = 'SET_STATUS' | 'SET_NILAI' | 'RESET_EXAM' | 'GET_USER' | 'UNKNOWN';

interface ParsedCommand {
  action: AdminAction;
  params: {
    user_id?: string;
    status?: string;
    nilai?: number;
    reason?: string;
  };
}

const STATUS_KEYWORDS: Record<string, string> = {
  'lulus': 'COMPLETED',
  'selesai': 'COMPLETED',
  'tuntas': 'COMPLETED',
  'curang': 'CHEATED',
  'cheating': 'CHEATED',
  'diskualifikasi': 'CHEATED',
  'dq': 'CHEATED',
  'timeout': 'TIMEOUT',
  'waktu habis': 'TIMEOUT',
  'blokir': 'BLOCKED',
  'block': 'BLOCKED',
  'reset': 'NONE',
  'bersihkan': 'NONE',
  'hapus status': 'NONE',
};

const RESET_PATTERNS = [
  /reset\s+(ujian|remedial|exam)/i,
  /ulang(i)?\s+(ujian|remedial|exam)/i,
  /hapus\s+data\s+(ujian|remedial|exam)/i,
  /bersih(kan)?\s+(ujian|remedial|exam)/i,
];

const SET_NILAI_PATTERNS = [
  /(?:set|ubah|ganti|kasih|beri(?:kan)?)\s+nilai\s+(.+?)\s+(?:jadi|ke|menjadi|=)\s*(\d+)/i,
  /nilai\s+(.+?)\s+(?:jadi|ke|menjadi|=|:)\s*(\d+)/i,
  /(.+?)\s+nilai(?:nya)?\s*(?:jadi|ke|menjadi|=|:)\s*(\d+)/i,
  /(.+?)\s*=\s*(\d+)/i,
];

const SET_STATUS_PATTERNS = [
  /(?:set|ubah|ganti)\s+status\s+(.+?)\s+(?:jadi|ke|menjadi)\s+(\S+)/i,
  /status\s+(.+?)\s+(?:jadi|ke|menjadi|=|:)\s*(\S+)/i,
  /(.+?)\s+(?:di)?(?:diskualifikasi|dq|blokir|block)/i,
];

const GET_USER_PATTERNS = [
  /(?:cek|lihat|info|data|cari)\s+(?:siswa|murid|user|student)\s+(.+)/i,
  /(?:siapa)\s+(.+)/i,
  /(?:cek|lihat)\s+(.+)/i,
];

function extractName(raw: string): string {
  return raw
    .replace(/^(siswa|murid|student|user|nama)\s+/i, '')
    .replace(/["']/g, '')
    .trim()
    .toUpperCase();
}

export function parseAdminCommand(message: string): ParsedCommand {
  const text = message.trim();

  if (!text || text.length < 3) {
    return { action: 'UNKNOWN', params: {} };
  }

  // 1. RESET_EXAM detection
  for (const pattern of RESET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const nameMatch = text.match(/(?:untuk|siswa|murid|student)\s+(.+?)(?:\s*$)/i);
      return {
        action: 'RESET_EXAM',
        params: {
          user_id: nameMatch ? extractName(nameMatch[1]) : undefined,
        },
      };
    }
  }

  // 2. SET_NILAI detection
  for (const pattern of SET_NILAI_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const name = extractName(match[1]);
      const nilai = parseInt(match[2]);
      if (isNaN(nilai) || nilai < 0 || nilai > 100) continue;
      return {
        action: 'SET_NILAI',
        params: {
          user_id: name,
          nilai,
        },
      };
    }
  }

  // 3. SET_STATUS detection (explicit patterns)
  for (const pattern of SET_STATUS_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const name = extractName(match[1]);
      const rawStatus = match[2]?.toLowerCase();
      const resolvedStatus = rawStatus ? (STATUS_KEYWORDS[rawStatus] || rawStatus.toUpperCase()) : undefined;
      return {
        action: 'SET_STATUS',
        params: {
          user_id: name,
          status: resolvedStatus,
        },
      };
    }
  }

  // 3b. SET_STATUS via keyword scan (e.g. "diskualifikasi Ahmad")
  const lowerText = text.toLowerCase();
  for (const [keyword, status] of Object.entries(STATUS_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      const withoutKeyword = lowerText.replace(keyword, '').trim();
      const nameCandidate = withoutKeyword
        .replace(/^(siswa|murid|student|user|nama)\s+/i, '')
        .replace(/["']/g, '')
        .trim();

      if (nameCandidate.length >= 2) {
        return {
          action: 'SET_STATUS',
          params: {
            user_id: nameCandidate.toUpperCase(),
            status,
          },
        };
      }
    }
  }

  // 4. GET_USER detection
  for (const pattern of GET_USER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        action: 'GET_USER',
        params: {
          user_id: extractName(match[1]),
        },
      };
    }
  }

  return { action: 'UNKNOWN', params: {} };
}
