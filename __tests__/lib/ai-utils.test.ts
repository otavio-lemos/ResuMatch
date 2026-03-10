import { robustJsonParse } from '@/lib/ai-utils';

describe('robustJsonParse', () => {
    it('should parse valid JSON', () => {
        const result = robustJsonParse('{"name": "test"}');
        expect(result).toEqual({ name: 'test' });
    });

    it('should handle JSON with markdown fences', () => {
        const result = robustJsonParse('```json\n{"name": "test"}\n```');
        expect(result).toEqual({ name: 'test' });
    });

    it('should handle trailing commas', () => {
        const result = robustJsonParse('{"name": "test",}');
        expect(result).toEqual({ name: 'test' });
    });

    it('should handle trailing commas in arrays', () => {
        const result = robustJsonParse('{"items": ["a", "b",]}');
        expect(result).toEqual({ items: ['a', 'b'] });
    });

    it('should throw with original text on failure', () => {
        expect(() => robustJsonParse('{invalid')).toThrow(/Texto recebido/);
    });

    it('should throw on empty input', () => {
        expect(() => robustJsonParse('')).toThrow('empty');
    });

    it('should handle nested objects with trailing commas', () => {
        const result = robustJsonParse('{"user": {"name": "test",},}');
        expect(result).toEqual({ user: { name: 'test' } });
    });

    it('should extract JSON from mixed text', () => {
        const result = robustJsonParse('some text {"key": "value"} more text');
        expect(result).toEqual({ key: 'value' });
    });
});
