import crypto from 'crypto';

const SECRET = process.env.ATTEMPT_TOKEN_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'gm-default-secret-key';

export function generateAttemptToken(sessionId: string, studentId: string): string {
  const attemptId = crypto.randomUUID();
  const payload = `${attemptId}:${sessionId}:${studentId}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}:${signature}`;
}

export function verifyAttemptToken(token: string, sessionId: string, studentId: string): { valid: boolean; attemptId?: string } {
  try {
    const parts = token.split(':');
    if (parts.length < 5) return { valid: false };

    const [attemptId, tokenSessionId, tokenStudentId, timestamp, signature] = parts;

    // Verify session and student match
    if (tokenSessionId !== sessionId || tokenStudentId !== studentId) {
      return { valid: false };
    }

    // Verify HMAC signature
    const payload = `${attemptId}:${tokenSessionId}:${tokenStudentId}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);

    if (signature !== expectedSig) {
      return { valid: false };
    }

    // Check token age (max 4 hours)
    const tokenAge = Date.now() - Number(timestamp);
    if (tokenAge > 4 * 60 * 60 * 1000) {
      return { valid: false };
    }

    return { valid: true, attemptId };
  } catch {
    return { valid: false };
  }
}
