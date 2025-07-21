"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = exports.checkRateLimit = exports.rateLimiters = exports.createRateLimiter = void 0;
const ratelimit_1 = require("@upstash/ratelimit");
const client_1 = require("./client");
// Create different rate limiters for different use cases
const createRateLimiter = (config, identifier = 'default') => {
    return new ratelimit_1.Ratelimit({
        redis: client_1.redis,
        limiter: ratelimit_1.Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `ratelimit:${identifier}`,
        analytics: true,
    });
};
exports.createRateLimiter = createRateLimiter;
// Pre-configured rate limiters
exports.rateLimiters = {
    // General API requests
    api: (0, exports.createRateLimiter)({ requests: 100, window: '1m' }, 'api'),
    // Chat messages
    messages: (0, exports.createRateLimiter)({ requests: 10, window: '1m' }, 'messages'),
    // Audio messages (more restrictive)
    audio: (0, exports.createRateLimiter)({ requests: 10, window: '1m' }, 'audio'),
    // Room creation
    roomCreation: (0, exports.createRateLimiter)({ requests: 5, window: '1h' }, 'room-creation'),
    // User sync
    userSync: (0, exports.createRateLimiter)({ requests: 10, window: '1m' }, 'user-sync'),
};
// Helper function to check rate limit
const checkRateLimit = async (rateLimiter, identifier) => {
    const result = await rateLimiter.limit(identifier);
    return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
    };
};
exports.checkRateLimit = checkRateLimit;
// Middleware-friendly rate limit checker
const rateLimitMiddleware = (rateLimiter) => {
    return async (identifier) => {
        const result = await (0, exports.checkRateLimit)(rateLimiter, identifier);
        if (!result.success) {
            const error = new Error('Rate limit exceeded');
            error.statusCode = 429;
            error.rateLimitInfo = result;
            throw error;
        }
        return result;
    };
};
exports.rateLimitMiddleware = rateLimitMiddleware;
