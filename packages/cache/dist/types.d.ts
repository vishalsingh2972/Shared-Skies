export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: Date;
}
export interface RateLimitConfig {
    requests: number;
    window: `${number}${'s' | 'm' | 'h' | 'd'}`;
}
export interface CacheOptions {
    ttl?: number;
}
