import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: error.errors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ error: error.message, details: error.details }),
      { status: error.statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.error('Unexpected error:', error);
  return new Response(
    JSON.stringify({ error: 'Internal server error' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}
