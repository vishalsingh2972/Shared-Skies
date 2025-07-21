"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("@upstash/redis");
const globalForRedis = globalThis;
exports.redis = globalForRedis.redis ?? new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = exports.redis;
}
exports.default = exports.redis;
