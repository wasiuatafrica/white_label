import { getSessionsRevokedAtMs, setSessionsRevokedAtMs } from '@/db/queries/app-settings';
import { getPartnerAdminSessionsRevokedAtMs, setPartnerAdminSessionsRevokedAtMs } from '@/db/queries/partners';
import { getTraderSessionsRevokedAtMs, setTraderSessionsRevokedAtMs } from '@/db/queries/traders';

// Longer TTL cuts app_settings reads on every authed request; revoke-all
// still primes the cache immediately via primeSessionsRevokedAtCache.
const CACHE_TTL_MS = 60_000;

let cachedRevokedAtMs = 0;
let cacheExpiresAt = 0;
let inflight: Promise<number> | null = null;

export async function getSessionsRevokedAtMsCached(): Promise<number> {
  const now = Date.now();
  if (now < cacheExpiresAt) {
    return cachedRevokedAtMs;
  }

  if (!inflight) {
    inflight = getSessionsRevokedAtMs()
      .then((value) => {
        cachedRevokedAtMs = value;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function primeSessionsRevokedAtCache(revokedAtMs: number) {
  cachedRevokedAtMs = revokedAtMs;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export async function isSessionIssuedBeforeRevocation(iat: number | undefined): Promise<boolean> {
  const revokedAtMs = await getSessionsRevokedAtMsCached();
  if (revokedAtMs <= 0) return false;
  if (iat === undefined) return true;
  return iat < revokedAtMs;
}

export async function revokeAllStatefulSessions() {
  const revokedAtMs = Date.now();
  await setSessionsRevokedAtMs(revokedAtMs);
  primeSessionsRevokedAtCache(revokedAtMs);
  return revokedAtMs;
}

const subjectCache = new Map<string, { value: number; expiresAt: number }>();

async function readSubjectRevokedAt(
  cacheKey: string,
  load: () => Promise<number>
): Promise<number> {
  const now = Date.now();
  const cached = subjectCache.get(cacheKey);
  if (cached && now < cached.expiresAt) return cached.value;

  const value = await load();
  subjectCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function issuedBefore(iat: number | undefined, revokedAtMs: number) {
  if (revokedAtMs <= 0) return false;
  if (iat === undefined) return true;
  return iat <= revokedAtMs;
}

export function primePartnerAdminSessionsRevokedAt(partnerId: number, revokedAtMs = 0) {
  subjectCache.set(`partner:${partnerId}`, {
    value: revokedAtMs,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function isPartnerAdminSessionRevoked(
  partnerId: number,
  iat: number | undefined
) {
  const revokedAtMs = await readSubjectRevokedAt(`partner:${partnerId}`, () =>
    getPartnerAdminSessionsRevokedAtMs(partnerId)
  );
  return issuedBefore(iat, revokedAtMs);
}

export async function revokePartnerAdminSessions(partnerId: number) {
  const revokedAtMs = Date.now();
  await setPartnerAdminSessionsRevokedAtMs(partnerId, revokedAtMs);
  subjectCache.set(`partner:${partnerId}`, {
    value: revokedAtMs,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return revokedAtMs;
}

export async function isTraderSessionRevoked(traderId: number, iat: number | undefined) {
  const revokedAtMs = await readSubjectRevokedAt(`trader:${traderId}`, () =>
    getTraderSessionsRevokedAtMs(traderId)
  );
  return issuedBefore(iat, revokedAtMs);
}

export async function revokeTraderSessions(traderId: number) {
  const revokedAtMs = Date.now();
  await setTraderSessionsRevokedAtMs(traderId, revokedAtMs);
  subjectCache.set(`trader:${traderId}`, {
    value: revokedAtMs,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return revokedAtMs;
}
