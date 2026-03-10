import { logger } from './logger';

/**
 * Robustly extracts and parses JSON from a string that might contain
 * markdown code blocks, preamble text, or trailing content.
 */
export function robustJsonParse(text: string): any {
    if (!text || typeof text !== 'string') {
        throw new Error('Robust parsing failed: Input is empty or not a string');
    }

    let cleaned = text.trim();

    // 1. Remove Markdown code fences
    cleaned = cleaned.replace(/```json\n?|```/g, '').trim();

    // 2. Try to find the first '{' and last '}' to isolate a JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // 3. Initial attempt at parsing
    try {
        return JSON.parse(cleaned);
    } catch (err: any) {
        logger.warn('First JSON parse attempt failed. Attempting cleanup of trailing commas...', { error: err.message });

        try {
            // 4. Cleanup trailing commas in objects and arrays
            // This regex finds a comma before a closing brace or bracket
            const withoutTrailingCommas = cleaned
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');

            return JSON.parse(withoutTrailingCommas);
        } catch (err2: any) {
            logger.error('Robust JSON parsing failed completely.', {
                originalError: err.message,
                cleanupError: err2.message,
                snippet: text.substring(0, 100) + '...'
            });
            throw new Error(`Falha ao processar resposta da IA: ${err.message}`);
        }
    }
}
