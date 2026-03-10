import { NextResponse } from 'next/server';

/**
 * Lightweight health check endpoint for Kubernetes liveness and readiness probes.
 * Returns 200 immediately without touching the database or rendering React.
 * This avoids the overhead of probing a full SSR page every 10s.
 */
export async function GET() {
    return NextResponse.json(
        { status: 'ok', timestamp: new Date().toISOString() },
        { status: 200 }
    );
}
