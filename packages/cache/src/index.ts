export { redis, default as redisClient } from './client';
import { redis } from './client';

export { 
  createRateLimiter, 
  rateLimiters, 
  checkRateLimit, 
  rateLimitMiddleware 
} from './rate-limiter';
export * from './types';

// Cache utilities
export const cache = {
  // Set value with optional TTL
  set: async (key: string, value: any, ttl?: number) => {
    if (ttl) {
      return redis.setex(key, ttl, JSON.stringify(value));
    }
    return redis.set(key, JSON.stringify(value));
  },
  
  // Get value
  get: async <T = any>(key: string): Promise<T | null> => {
    const value = await redis.get(key);
    return value ? JSON.parse(value as string) : null;
  },
  
  // Delete key
  del: async (key: string) => {
    return redis.del(key);
  },
  
  // Check if key exists
  exists: async (key: string) => {
    return redis.exists(key);
  },
  
  // Increment counter
  incr: async (key: string, ttl?: number) => {
    const result = await redis.incr(key);
    if (ttl && result === 1) {
      await redis.expire(key, ttl);
    }
    return result;
  },
};