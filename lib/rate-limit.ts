import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

/**
 * DEPRECATED: Local rate limiting is disabled. 
 * The system now relies on the AI provider's own rate limiting.
 */
export function rateLimit(config: RateLimitConfig) {
    return (request: NextRequest, userId?: string): { allowed: boolean; remaining: number; resetIn: number } => {
        return { allowed: true, remaining: 999, resetIn: 0 };
    };
}

/**
 * Rate limit by a direct string ID (e.g., user ID).
 * Disabled: Always returns allowed.
 */
export function rateLimitById(id: string, config: RateLimitConfig) {
    return { allowed: true, remaining: 999, resetIn: 0 };
}

/**
 * Check rate limit directly by identifier string.
 * Disabled: Always returns allowed.
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
    return { allowed: true, remaining: 999, resetIn: 0 };
}

export function addRateLimitHeaders(
    response: NextResponse,
    remaining: number,
    resetIn: number
): NextResponse {
    // No-op
    return response;
}
