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
