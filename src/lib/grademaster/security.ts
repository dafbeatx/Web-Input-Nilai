import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validateSessionInput(body: {
  sessionName?: string;
  password?: string;
  teacher?: string;
  subject?: string;
}): string | null {
  if (!body.sessionName || body.sessionName.trim().length < 2) {
    return 'Nama sesi minimal 2 karakter';
  }
  if (body.sessionName.trim().length > 100) {
    return 'Nama sesi maksimal 100 karakter';
  }
  if (!body.password || body.password.trim().length < 4) {
    return 'Password minimal 4 karakter';
  }
  if (body.password.trim().length > 72) {
    return 'Password maksimal 72 karakter';
  }
  if (body.teacher && body.teacher.trim().length > 100) {
    return 'Nama guru maksimal 100 karakter';
  }
  if (body.subject && body.subject.trim().length > 100) {
    return 'Mata pelajaran maksimal 100 karakter';
  }
  return null;
}

// Simple in-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = attempts.get(identifier);

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

import stringSimilarity from 'string-similarity';

export function detectCheating(
  student: any, 
  allStudents: any[], 
  session: any, 
  submissionTimeMs: number
): { isCheated: boolean; flags: string[] } {
  let flags: string[] = [];

  // 1. Fast completion
  // Assume if completed under session.remedial_timer / 3 minutes = cheating
  // If timer is in minutes, convert to MS
  const remedialTimerMs = (session.remedial_timer || 15) * 60 * 1000;
  if (submissionTimeMs < (remedialTimerMs / 3)) {
    flags.push("Waktu Pengerjaan Sangat Cepat (Selesai < 1/3 waktu)");
  }

  // 2. Identical MCQ Answers (Compare with other students)
  if (student.mcqAnswers && Object.keys(student.mcqAnswers).length > 0) {
    for (const other of allStudents) {
      if (other.id === student.id) continue;
      
      const otherAnswers = other.mcq_answers || other.answers;
      if (!otherAnswers || Object.keys(otherAnswers).length === 0) continue;

      let isIdentical = true;
      for (const [qNum, ans] of Object.entries(student.mcqAnswers)) {
        if (otherAnswers[qNum] !== ans) {
          isIdentical = false;
          break;
        }
      }
      
      if (isIdentical) {
        flags.push(`Jawaban PG identik 100% dengan ${other.name}`);
        // Add dual penalty for this severity
        flags.push("Jawaban Identik"); 
        break; // Count once
      }
    }
  }

  // 3. High Essay Similarity > 0.9 with other students' answers
  if (student.remedialAnswers && student.remedialAnswers.length > 0) {
    for (const other of allStudents) {
      if (other.id === student.id) continue;
      
      const otherEssays = other.remedial_answers || other.remedialAnswers;
      if (!otherEssays || otherEssays.length === 0) continue;

      for (let i = 0; i < student.remedialAnswers.length; i++) {
        const myAns = student.remedialAnswers[i] || "";
        const theirAns = otherEssays[i] || "";
        
        if (myAns.trim() && theirAns.trim()) {
          const sim = stringSimilarity.compareTwoStrings(myAns.toLowerCase(), theirAns.toLowerCase());
          if (sim > 0.9) {
            flags.push(`Kemiripan Essay tinggi (>0.9) dengan ${other.name} (Soal ${i + 1})`);
            flags.push("Kemiripan Essay"); // Dual penalty
            break;
          }
        }
      }
    }
  }

  // Determine if cheated
  const isCheated = flags.length >= 3;
  return { isCheated, flags };
}
