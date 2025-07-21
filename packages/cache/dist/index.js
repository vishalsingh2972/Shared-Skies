"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.rateLimitMiddleware = exports.checkRateLimit = exports.rateLimiters = exports.createRateLimiter = exports.redisClient = exports.redis = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "redis", { enumerable: true, get: function () { return client_1.redis; } });
Object.defineProperty(exports, "redisClient", { enumerable: true, get: function () { return __importDefault(client_1).default; } });
const client_2 = require("./client");
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "createRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.createRateLimiter; } });
Object.defineProperty(exports, "rateLimiters", { enumerable: true, get: function () { return rate_limiter_1.rateLimiters; } });
Object.defineProperty(exports, "checkRateLimit", { enumerable: true, get: function () { return rate_limiter_1.checkRateLimit; } });
Object.defineProperty(exports, "rateLimitMiddleware", { enumerable: true, get: function () { return rate_limiter_1.rateLimitMiddleware; } });
__exportStar(require("./types"), exports);
// Cache utilities
exports.cache = {
    // Set value with optional TTL
    set: async (key, value, ttl) => {
        if (ttl) {
            return client_2.redis.setex(key, ttl, JSON.stringify(value));
        }
        return client_2.redis.set(key, JSON.stringify(value));
    },
    // Get value
    get: async (key) => {
        const value = await client_2.redis.get(key);
        return value ? JSON.parse(value) : null;
    },
    // Delete key
    del: async (key) => {
        return client_2.redis.del(key);
    },
    // Check if key exists
    exists: async (key) => {
        return client_2.redis.exists(key);
    },
    // Increment counter
    incr: async (key, ttl) => {
        const result = await client_2.redis.incr(key);
        if (ttl && result === 1) {
            await client_2.redis.expire(key, ttl);
        }
        return result;
    },
};
