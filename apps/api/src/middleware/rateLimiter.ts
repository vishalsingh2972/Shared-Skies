import { Request, Response, NextFunction } from 'express';
import { rateLimiters, rateLimitMiddleware } from '@shared-skies/cache';

// Get client IP helper
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Generic rate limiter middleware
export const createRateLimitMiddleware = (limiterName: keyof typeof rateLimiters) => {
  const limiter = rateLimiters[limiterName];
  const checkLimit = rateLimitMiddleware(limiter);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIP = getClientIP(req);
      const identifier = `${clientIP}`;
      
      const result = await checkLimit(identifier);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.getTime().toString(),
      });
      
      next();
    } catch (error: any) {
      if (error.statusCode === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          limit: error.rateLimitInfo.limit,
          remaining: error.rateLimitInfo.remaining,
          reset: error.rateLimitInfo.reset,
        });
      }
      next(error);
    }
  };
};

// Pre-configured middleware
export const apiRateLimit = createRateLimitMiddleware('api');
export const messageRateLimit = createRateLimitMiddleware('messages');
export const audioRateLimit = createRateLimitMiddleware('audio');
export const roomCreationRateLimit = createRateLimitMiddleware('roomCreation');
export const userSyncRateLimit = createRateLimitMiddleware('userSync');