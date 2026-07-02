import { randomInt } from 'node:crypto';
import argon2 from 'argon2';

const OTP_TTL_MS = 15 * 60 * 1000;

export function generatePartnerPinOtp() {
  return String(randomInt(100000, 1000000));
}

export async function hashPartnerPinOtp(otp: string) {
  return argon2.hash(otp, { type: argon2.argon2id });
}

export async function verifyPartnerPinOtp(hash: string, otp: string) {
  try {
    return await argon2.verify(hash, otp);
  } catch {
    return false;
  }
}

export function partnerPinOtpExpiresAt() {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function isPartnerPinOtpExpired(expiresAt: Date | null | undefined) {
  if (!expiresAt) return true;
  return expiresAt.getTime() < Date.now();
}
