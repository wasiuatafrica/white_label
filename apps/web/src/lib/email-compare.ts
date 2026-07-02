import crypto from 'crypto';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailsMatch(stored: string, candidate: string) {
  const a = Buffer.from(normalizeEmail(stored));
  const b = Buffer.from(normalizeEmail(candidate));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
