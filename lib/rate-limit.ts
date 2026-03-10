import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

const store: RateLimitStore = new Map();

function getClientIdentifier(request: NextRequest, userId?: string): string {
    if (userId) return `user:${userId}`;
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `ip:${ip}`;
}

export function rateLimit(config: RateLimitConfig) {
    return (request: NextRequest, userId?: string): { allowed: boolean; remaining: number; resetIn: number } => {
        const identifier = getClientIdentifier(request, userId);
        return checkRateLimit(identifier, config);
    };
}

/**
 * Rate limit by a direct string ID (e.g., user ID).
 * Useful for Server Actions where NextRequest is not available.
 */
export function rateLimitById(id: string, config: RateLimitConfig) {
    return checkRateLimit(`id:${id}`, config);
}

function checkRateLimit(identifier: string, config: RateLimitConfig) {
    const now = Date.now();
    
    const record = store.get(identifier);
    
    if (!record || now > record.resetTime) {
        store.set(identifier, {
            count: 1,
            resetTime: now + config.windowMs
        });
        return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
    }
    
    if (record.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }
    
    record.count++;
    return { allowed: true, remaining: config.maxRequests - record.count, resetIn: record.resetTime - now };
}

export function addRateLimitHeaders(
    response: NextResponse,
    remaining: number,
    resetIn: number
): NextResponse {
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil((Date.now() + resetIn) / 1000).toString());
    return response;
}
