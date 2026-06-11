import { randomInt } from 'node:crypto';

const PIN_PATTERN = /^\d{4,12}$/;

export function generatePartnerAdminPin() {
  return String(randomInt(100000, 1000000));
}

export function isValidPartnerAdminPin(pin: unknown) {
  return typeof pin === 'string' && PIN_PATTERN.test(pin);
}

export function partnerPinNeedsGeneration(pin: string | null | undefined) {
  return !pin || pin === '0000';
}
