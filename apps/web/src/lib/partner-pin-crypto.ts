import argon2 from 'argon2';
import crypto from 'crypto';
import { isHashedPartnerPin, partnerPinNeedsGeneration } from '@/lib/admin-pin';

export async function hashPartnerAdminPin(pin: string) {
  return argon2.hash(pin, { type: argon2.argon2id });
}

export async function verifyPartnerAdminPin(stored: string, candidate: string) {
  if (partnerPinNeedsGeneration(stored)) {
    return false;
  }

  if (isHashedPartnerPin(stored)) {
    try {
      return await argon2.verify(stored, candidate);
    } catch {
      return false;
    }
  }

  const expected = Buffer.from(stored);
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export async function maybeRehashPartnerAdminPin(stored: string, candidate: string) {
  if (isHashedPartnerPin(stored)) return null;
  const matches = await verifyPartnerAdminPin(stored, candidate);
  if (!matches) return null;
  return hashPartnerAdminPin(candidate);
}
