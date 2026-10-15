import crypto from 'crypto';

export function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
