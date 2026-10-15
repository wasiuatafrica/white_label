import { randomUUID } from 'crypto';
import { getRedisClient } from '@/lib/redis';

const memory = new Map<string, number>();

function memoryKey(scope: string, jti: string) {
  return `${scope}:${jti}`;
}

function purgeExpired(now: number) {
  for (const [key, expiresAt] of memory) {
    if (expiresAt <= now) memory.delete(key);
  }
}

export function createJti() {
  return randomUUID();
}

export async function issueOneShot(scope: string, jti: string, ttlMs: number): Promise<boolean> {
  const redis = getRedisClient();
  const key = memoryKey(scope, jti);
  if (redis) {
    try {
      const result = await redis.set(key, '1', 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('[one-shot] issue error', error);
      if (process.env.NODE_ENV === 'production') return false;
    }
  } else if (process.env.NODE_ENV === 'production') {
    return false;
  }

  purgeExpired(Date.now());
  memory.set(key, Date.now() + ttlMs);
  return true;
}

export async function consumeOneShot(scope: string, jti: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = memoryKey(scope, jti);
  if (redis) {
    try {
      const value = (await redis.eval(
        "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v",
        1,
        key
      )) as string | null;
      return value === '1';
    } catch (error) {
      console.error('[one-shot] consume error', error);
      if (process.env.NODE_ENV === 'production') return false;
    }
  } else if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const expiresAt = memory.get(key);
  if (!expiresAt || expiresAt <= Date.now()) {
    memory.delete(key);
    return false;
  }
  memory.delete(key);
  return true;
}
