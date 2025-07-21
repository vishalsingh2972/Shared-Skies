export { redis, default as redisClient } from './client';
export { createRateLimiter, rateLimiters, checkRateLimit, rateLimitMiddleware } from './rate-limiter';
export * from './types';
export declare const cache: {
    set: (key: string, value: any, ttl?: number) => Promise<string | null>;
    get: <T = any>(key: string) => Promise<T | null>;
    del: (key: string) => Promise<number>;
    exists: (key: string) => Promise<number>;
    incr: (key: string, ttl?: number) => Promise<number>;
};
