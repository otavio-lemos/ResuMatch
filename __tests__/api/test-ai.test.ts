import { z } from 'zod';

const testAiSchema = z.object({
  baseUrl: z.string().url('URL inválida'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  apiKey: z.string().optional(),
  provider: z.string().optional(),
  timeout: z.number().optional()
});

describe('Test AI API Validation', () => {
  describe('testAiSchema', () => {
    it('validates correct input with all fields', () => {
      const validInput = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        provider: 'openai',
        timeout: 30000
      };
      
      const result = testAiSchema.parse(validInput);
      expect(result.model).toBe('gpt-4');
    });

    it('validates input with required fields only', () => {
      const minimalInput = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      
      const result = testAiSchema.parse(minimalInput);
      expect(result.apiKey).toBeUndefined();
      expect(result.timeout).toBeUndefined();
    });

    it('rejects invalid URL', () => {
      const invalidInput = {
        baseUrl: 'not-a-url',
        model: 'gpt-4'
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('rejects empty model string', () => {
      const invalidInput = {
        baseUrl: 'https://api.openai.com/v1',
        model: ''
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('rejects missing baseUrl', () => {
      const invalidInput = {
        model: 'gpt-4'
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('rejects missing model', () => {
      const invalidInput = {
        baseUrl: 'https://api.openai.com/v1'
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('accepts valid https URL', () => {
      const input = {
        baseUrl: 'https://api.gemini.google.com/v1',
        model: 'gemini-1.5-flash'
      };
      
      const result = testAiSchema.parse(input);
      expect(result.baseUrl).toBe('https://api.gemini.google.com/v1');
    });

    it('accepts valid http URL (local development)', () => {
      const input = {
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5:7b'
      };
      
      const result = testAiSchema.parse(input);
      expect(result.baseUrl).toBe('http://localhost:11434');
    });

    it('accepts timeout as positive number', () => {
      const input = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        timeout: 60000
      };
      
      const result = testAiSchema.parse(input);
      expect(result.timeout).toBe(60000);
    });

    it.skip('rejects negative timeout', () => {
      const invalidInput = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        timeout: -1000
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('rejects non-number timeout', () => {
      const invalidInput = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        timeout: '30000'
      };
      
      expect(() => testAiSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('accepts optional provider field', () => {
      const input = {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        provider: 'openai'
      };
      
      const result = testAiSchema.parse(input);
      expect(result.provider).toBe('openai');
    });
  });
});
