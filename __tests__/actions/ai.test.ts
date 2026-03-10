import { rewriteText, correctGrammar } from '@/app/actions/ai';

// Mock logger to avoid cluttering test output
jest.mock('@/lib/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

const processEnv = process.env;

describe('AI Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...processEnv, GEMINI_API_KEY: 'test-api-key' };
        
        // Mock global fetch
        global.fetch = jest.fn() as jest.Mock;
    });

    afterAll(() => {
        process.env = processEnv;
    });

    describe('rewriteText', () => {
        it('returns empty string if input is empty', async () => {
            const result = await rewriteText('');
            expect(result).toBe('');
        });

        it('returns the AI generated text from Gemini on success', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Rewritten text' }] } }]
                })
            });

            const result = await rewriteText('Original text');
            expect(result).toBe('Rewritten text');
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('throws error on Gemini API failure', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: ''
            });

            await expect(rewriteText('Texto original')).rejects.toThrow('Erro na API Gemini (500)');
        });

        it('sanitizes input characters like { or }', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Safe result' }] } }]
                })
            });

            await rewriteText('Text with {injection}');
            
            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.contents[0].parts[0].text).toContain('Text with injection');
            expect(body.contents[0].parts[0].text).not.toContain('{');
        });
    });

    describe('correctGrammar', () => {
        it('returns empty string if input is empty', async () => {
            const result = await correctGrammar('');
            expect(result).toBe('');
        });

        it('returns the AI generated text on success', async () => {
             (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Corrected text' }] } }]
                })
            });

            const result = await correctGrammar('Originaltext with errrs');
            expect(result).toBe('Corrected text');
        });
    });
});
