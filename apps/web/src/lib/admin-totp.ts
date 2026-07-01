import { generateSecret, generateURI, verify } from 'otplib';
import { getRootDomain } from '@/lib/tenant';

export function getAdminTotpIssuer() {
  return `partners.${getRootDomain()} Admin`;
}

export function createTotpSecret() {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string) {
  return generateURI({
    issuer: getAdminTotpIssuer(),
    label: email,
    secret,
  });
}

export async function verifyTotpCode(secret: string, code: string) {
  const result = await verify({ secret, token: code });
  return result.valid;
}
