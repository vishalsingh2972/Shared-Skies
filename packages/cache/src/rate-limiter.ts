import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './client';
import { RateLimitResult, RateLimitConfig } from './types';

// Create different rate limiters for different use cases
export const createRateLimiter = (config: RateLimitConfig, identifier: string = 'default') => {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `ratelimit:${identifier}`,
    analytics: true,
  });
};

// Pre-configured rate limiters
export const rateLimiters = {
  // General API requests
  api: createRateLimiter({ requests: 100, window: '1m' }, 'api'),
  
  // Chat messages
  messages: createRateLimiter({ requests: 10, window: '1m' }, 'messages'),
  
  // Audio messages (more restrictive)
  audio: createRateLimiter({ requests: 10, window: '1m' }, 'audio'),
  
  // Room creation
  roomCreation: createRateLimiter({ requests: 5, window: '1h' }, 'room-creation'),
  
  // User sync
  userSync: createRateLimiter({ requests: 10, window: '1m' }, 'user-sync'),
};

// Helper function to check rate limit
export const checkRateLimit = async (
  rateLimiter: Ratelimit, 
  identifier: string
): Promise<RateLimitResult> => {
  const result = await rateLimiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset),
  };
};

// Middleware-friendly rate limit checker
export const rateLimitMiddleware = (rateLimiter: Ratelimit) => {
  return async (identifier: string) => {
    const result = await checkRateLimit(rateLimiter, identifier);
    
    if (!result.success) {
      const error = new Error('Rate limit exceeded');
      (error as any).statusCode = 429;
      (error as any).rateLimitInfo = result;
      throw error;
    }
    
    return result;
  };
};