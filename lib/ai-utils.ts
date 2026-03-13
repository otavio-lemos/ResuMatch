import { logger } from './logger';

/**
 * Robustly extracts and parses JSON from a string that might contain
 * markdown code blocks, preamble text, or trailing content.
 */
export function robustJsonParse(text: string): any {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('Robust parsing received empty input. Returning empty object.');
        return {};
    }

    let cleaned = text.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\n?|```/g, '').trim();

    // Remove common prefixes that models add before JSON
    // e.g., "Aqui está o JSON:", "Here is the JSON:", "```json"
    cleaned = cleaned.replace(/^(?:Aqui está|Here is|The following is)(?:\s+o\s+)?(?:JSON|json|dados|data):?\s*/i, '');

    // Try to find the outermost JSON structure (object or array)
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
    const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

    if (hasObject && hasArray) {
        // If both exist, see which one is the outermost
        if (firstBracket < firstBrace && lastBracket > lastBrace) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
    } else if (hasObject) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else if (hasArray) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch (err: any) {
        logger.warn('First JSON parse attempt failed. Attempting cleanup...', { error: err.message });

        try {
            // More aggressive cleanup
            let fixed = cleaned
                // Remove trailing commas
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                // Fix common issues with keys without quotes
                .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
                // Remove any remaining text before { or [
                .replace(/^[^{\[]+/, '');

            return JSON.parse(fixed);
        } catch (err2: any) {
            logger.error('Robust JSON parsing failed completely.', {
                originalError: err.message,
                cleanupError: err2.message,
                snippet: text.substring(0, 500) + '...'
            });
            throw new Error(`Falha ao processar resposta da IA: ${err.message}. Texto recebido: ${text.substring(0, 200)}...`);
        }
    }
}
