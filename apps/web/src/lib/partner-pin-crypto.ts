import argon2 from 'argon2';
import { isHashedPartnerPin, partnerPinNeedsGeneration } from '@/lib/admin-pin';

export async function hashPartnerAdminPin(pin: string) {
  return argon2.hash(pin, { type: argon2.argon2id });
}

export async function verifyPartnerAdminPin(stored: string, candidate: string) {
  if (partnerPinNeedsGeneration(stored)) {
    return false;
  }

  if (!isHashedPartnerPin(stored)) {
    return false;
  }

  try {
    return await argon2.verify(stored, candidate);
  } catch {
    return false;
  }
}
