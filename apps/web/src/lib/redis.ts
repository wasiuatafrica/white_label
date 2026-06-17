import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClient) {
    redisClient = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redisClient.on('error', (err) => {
      console.error('[redis] connection error', err);
    });
  }

  return redisClient;
}
