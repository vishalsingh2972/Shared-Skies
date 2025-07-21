export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

// Fix: Remove the space in the template literal
export interface RateLimitConfig {
  requests: number;
  window: `${number}${'s' | 'm' | 'h' | 'd'}`; // No space between number and unit
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}
