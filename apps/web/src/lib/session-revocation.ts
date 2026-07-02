import { getSessionsRevokedAtMs, setSessionsRevokedAtMs } from '@/db/queries/app-settings';

const CACHE_TTL_MS = 3_000;

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
