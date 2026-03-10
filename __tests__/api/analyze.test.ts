import { z } from 'zod';

const analyzeSchema = z.object({
  resumeData: z.record(z.any()).optional(),
  atsPrompt: z.string().optional(),
  jobDescription: z.string().optional(),
  aiSettings: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  language: z.enum(['pt', 'en']).default('pt')
});

describe('Analyze API Validation', () => {
  describe('analyzeSchema', () => {
    it('validates correct input with language', () => {
      const input = { language: 'en' };
      const result = analyzeSchema.parse(input);
      expect(result.language).toBe('en');
    });

    it('validates input with only required fields', () => {
      const minimalInput = {};
      
      const result = analyzeSchema.parse(minimalInput);
      expect(result.language).toBe('pt');
    });

    it('rejects invalid language', () => {
      const invalidInput = { language: 'invalid' };
      
      expect(() => analyzeSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('rejects wrong types for string fields', () => {
      const invalidInput = { atsPrompt: 123 };
      
      expect(() => analyzeSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('accepts pt language', () => {
      const input = { language: 'pt' };
      
      const result = analyzeSchema.parse(input);
      expect(result.language).toBe('pt');
    });

    it('accepts en language', () => {
      const input = { language: 'en' };
      
      const result = analyzeSchema.parse(input);
      expect(result.language).toBe('en');
    });

    it('applies default language when not provided', () => {
      const input = {};
      
      const result = analyzeSchema.parse(input);
      expect(result.language).toBe('pt');
    });
  });
});
