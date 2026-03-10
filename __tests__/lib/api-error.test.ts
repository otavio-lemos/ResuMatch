import { z } from 'zod';

class MockResponse {
  status: number;
  body: string;
  headers: Map<string, string>;
  
  constructor(body: any, init?: { status?: number }) {
    this.status = init?.status || 200;
    this.body = JSON.stringify(body);
    this.headers = new Map([['Content-Type', 'application/json']]);
  }
  
  static json(data: any, init?: { status?: number }) {
    return new MockResponse(data, init);
  }
}

(global as any).Response = MockResponse;

import { ApiError, handleApiError, successResponse } from '@/lib/api-error';

describe('API Error Handler', () => {
  describe('ApiError class', () => {
    it('creates error with status code', () => {
      const error = new ApiError(400, 'Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.name).toBe('ApiError');
    });

    it('includes details', () => {
      const error = new ApiError(422, 'Validation failed', { field: 'name' });
      expect(error.details).toEqual({ field: 'name' });
    });
  });

  describe('handleApiError', () => {
    it('handles ZodError', () => {
      const zodError = new z.ZodError([
        { code: 'too_small', path: ['name'], message: 'Required' }
      ]);
      
      const result = handleApiError(zodError);
      expect(result.status).toBe(400);
    });

    it('handles ApiError', () => {
      const apiError = new ApiError(401, 'Unauthorized');
      
      const result = handleApiError(apiError);
      expect(result.status).toBe(401);
    });

    it('handles unknown errors', () => {
      const result = handleApiError(new Error('Unknown'));
      expect(result.status).toBe(500);
    });
  });
});
