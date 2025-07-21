import { Ratelimit } from '@upstash/ratelimit';
import { RateLimitResult, RateLimitConfig } from './types';
export declare const createRateLimiter: (config: RateLimitConfig, identifier?: string) => Ratelimit;
export declare const rateLimiters: {
    api: Ratelimit;
    messages: Ratelimit;
    audio: Ratelimit;
    roomCreation: Ratelimit;
    userSync: Ratelimit;
};
export declare const checkRateLimit: (rateLimiter: Ratelimit, identifier: string) => Promise<RateLimitResult>;
export declare const rateLimitMiddleware: (rateLimiter: Ratelimit) => (identifier: string) => Promise<RateLimitResult>;
