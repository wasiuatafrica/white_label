import { getRedisClient } from '@/lib/redis';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitOptions = {
  /** Production auth endpoints deny the request when Redis cannot be reached. */
  failClosed?: boolean;
};

function memoryCheck(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

function denied(retryAfterSeconds = 60): RateLimitResult {
  return { allowed: false, retryAfterSeconds };
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const failClosed = options.failClosed === true && process.env.NODE_ENV === 'production';

  if (!redis) {
    if (failClosed) return denied();
    return memoryCheck(key, maxAttempts, windowMs);
  }

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }
    if (count > maxAttempts) {
      const ttl = await redis.pttl(key);
      const retryAfterSeconds = Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true };
  } catch (error) {
    console.error('[rate-limit] redis error', error);
    if (failClosed) return denied();
    return memoryCheck(key, maxAttempts, windowMs);
  }
}

export async function resetRateLimit(key: string) {
  buckets.delete(key);
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error('[rate-limit] redis reset error', error);
  }
}

/** Rightmost X-Forwarded-For hop is the address appended by the edge proxy. */
export function getTrustedClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const hops = forwarded
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return hops?.at(-1) || request.headers.get('x-real-ip') || null;
}

export function getRequestRateLimitKey(request: Request, scope: string) {
  return `${scope}:${getTrustedClientIp(request) || 'unknown'}`;
}
