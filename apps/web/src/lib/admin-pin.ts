import { randomInt } from 'node:crypto';

const PIN_PATTERN = /^\d{4,12}$/;

export function isHashedPartnerPin(pin: string) {
  return pin.startsWith('$argon2');
}

export function generatePartnerAdminPin() {
  return String(randomInt(100000, 1000000));
}

export function isValidPartnerAdminPin(pin: unknown) {
  return typeof pin === 'string' && PIN_PATTERN.test(pin);
}

export function partnerPinNeedsGeneration(pin: string | null | undefined) {
  if (!pin || pin === '0000') return true;
  return !isHashedPartnerPin(pin);
}
