'use server';

import OpenAI from 'openai';
import { ResumeData } from '@/store/useResumeStore';
import { AISettings } from '@/store/useAISettingsStore';
import { logger } from '@/lib/logger';
import { getAtsAnalyzerSkill, getAtsParserSkill, getAtsSummarySkill, getResumeEditorSummarySkill, getResumeEditorRewriteSkill, getResumeEditorGrammarSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getTranslation } from '@/hooks/useTranslation';
import { Language } from '@/lib/translations';


export type AIAuthSettings = Partial<AISettings>;

export type AIConfig = 
    | { type: 'gemini'; apiKey: string; endpoint: string; temperature: number; maxTokens: number }
    | { type: 'openai'; client: OpenAI; model: string; temperature: number; maxTokens: number };

export const getAIClient = async (authSettings?: AIAuthSettings): Promise<AIConfig> => {
    if (authSettings?.apiKey) {
        const provider = authSettings.provider || 'gemini';
        if (provider === 'gemini') {
            return {
                type: 'gemini' as const,
                apiKey: authSettings.apiKey,
                endpoint: `${authSettings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/'}models/${authSettings.model || 'gemini-1.5-flash'}:generateContent`,
                temperature: authSettings.temperature ?? 0.1,
                maxTokens: authSettings.maxTokens ?? 16384
            };
        } else {
            return {
                type: 'openai' as const,
                client: new OpenAI({ baseURL: authSettings.baseUrl || 'https://api.openai.com/v1', apiKey: authSettings.apiKey }),
                model: authSettings.model || (provider === 'ollama' ? 'llama3.2:3b' : 'gpt-3.5-turbo'),
                temperature: authSettings.temperature ?? 0.1,
                maxTokens: authSettings.maxTokens ?? 4096
            };
        }
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) return { type: 'gemini' as const, apiKey: geminiKey, endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, temperature: 0.1, maxTokens: 16384 };
    throw new Error('Configuração de IA não encontrada. Defina a chave API nas configurações (ícone de engrenagem) ou configure GEMINI_API_KEY no arquivo .env');
};

async function callAI(prompt: string, aiConfig: AIConfig, responseFormat?: 'json_object', skill?: string, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const systemInstruction = skill || getAtsAnalyzerSkill();
    try {
        if (aiConfig.type === 'gemini') {
            const res = await fetch(`${aiConfig.endpoint}?key=${aiConfig.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    generationConfig: {
                        temperature: aiConfig.temperature || 0.1,
                        maxOutputTokens: aiConfig.maxTokens || 16384,
                        responseMimeType: responseFormat === 'json_object' ? 'application/json' : 'text/plain',
                    },
                    safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }]
                })
            });
            if (!res.ok) {
		if (res.status === 429) throw new Error(getTranslation('templates.rateLimitWait', language as Language).replace('{seconds}', '60'));
		if (res.status === 503) throw new Error(getTranslation('templates.aiServiceOverloaded', language as Language));

                let errorDetails = '';
                try {
                    const errorJson = await res.json();
                    errorDetails = errorJson.error?.message || res.statusText;
                } catch (e) {
                    errorDetails = res.statusText || res.status.toString();
                }

                throw new Error(`Erro na API Gemini (${res.status}): ${errorDetails}`);
            }
            const data = await res.json();
            const response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return { prompt, response };
        } else {
            const response = await aiConfig.client.chat.completions.create({
                model: aiConfig.model,
                messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }],
                temperature: aiConfig.temperature || 0.1,
                response_format: responseFormat ? { type: responseFormat } : undefined,
            });
            return { prompt, response: response.choices[0].message.content || '' };
        }
    } catch (error: any) {
        logger.error('AI Call failed', error);
        throw error;
    }
}

export async function rewriteText(text: string, authSettings?: AIAuthSettings & { rewritePrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    if (!text?.trim()) return { prompt: '', response: '' };
    const aiConfig = await getAIClient(authSettings);
    const safeText = text.replace(/[{}]/g, '');
    const instruction = language === 'en'
        ? `Execute Action 3: Rewrite (STAR) according to SKILL.md for this text: "${safeText}"`
        : `Execute a Fase 3: Rewrite (STAR) conforme o SKILL.md para este texto: "${safeText}"`;
    return callAI(authSettings?.rewritePrompt ? `${authSettings.rewritePrompt}\n${instruction}` : instruction, aiConfig, undefined, getResumeEditorRewriteSkill(language), language);
}

export async function correctGrammar(text: string, authSettings?: AIAuthSettings & { grammarPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    if (!text?.trim()) return { prompt: '', response: '' };
    const aiConfig = await getAIClient(authSettings);
    const instruction = language === 'en'
        ? `Execute Action 3: Grammar according to SKILL.md for this text: "${text}"`
        : `Execute a Fase 3: Grammar conforme o SKILL.md para este texto: "${text}"`;
    return callAI(authSettings?.grammarPrompt ? `${authSettings.grammarPrompt}\n${instruction}` : instruction, aiConfig, undefined, getResumeEditorGrammarSkill(language), language);
}

export async function generateSummaryAI(resumeData: ResumeData, authSettings?: AIAuthSettings & { summaryPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const aiConfig = await getAIClient(authSettings);
    const instruction = language === 'en'
        ? `Execute Action 3: Summary according to SKILL.md for this data: ${JSON.stringify(resumeData)}`
        : `Execute a Fase 3: Summary conforme o SKILL.md para estes dados: ${JSON.stringify(resumeData)}`;
    return callAI(authSettings?.summaryPrompt ? `${authSettings.summaryPrompt}\n${instruction}` : instruction, aiConfig, undefined, getResumeEditorSummarySkill(language), language);
}

export async function generateATSAnalysis(resumeData: ResumeData, jobDescription?: string, authSettings?: AIAuthSettings, language: string = 'pt'): Promise<{ prompt: string; response: any }> {
    const aiConfig = await getAIClient(authSettings);
    const instruction = jobDescription
        ? language === 'en'
            ? `Execute Action 2: Resume analysis with JOB MATCH according to SKILL.md. JOB: ${jobDescription}. DATA: ${JSON.stringify(resumeData)}`
            : `Execute a Fase 2: Análise de currículo com MATCH DE VAGA conforme o SKILL.md. VAGA: ${jobDescription}. DATA: ${JSON.stringify(resumeData)}`
        : language === 'en'
            ? `Execute Action 2: Resume analysis according to SKILL.md. DATA: ${JSON.stringify(resumeData)}`
            : `Execute a Fase 2: Análise de currículo conforme o SKILL.md. DADOS: ${JSON.stringify(resumeData)}`;
    const { prompt, response } = await callAI(instruction, aiConfig, 'json_object', undefined, language);
    return { prompt, response: robustJsonParse(response) };
}

export async function translateResumeData(data: ResumeData, targetLang: 'pt' | 'en', authSettings?: AIAuthSettings): Promise<{ prompt: string; response: ResumeData }> {
    const aiConfig = await getAIClient(authSettings);
    const prompt = `Traduza este currículo JSON para ${targetLang}. Mantenha a estrutura JSON: ${JSON.stringify(data)}`;
    const { response } = await callAI(prompt, aiConfig, 'json_object', undefined, 'pt');
    return { prompt, response: robustJsonParse(response) };
}

export async function parseResumeFromText(text: string, authSettings?: AIAuthSettings, language: string = 'pt'): Promise<{ prompt: string; response: Partial<ResumeData> }> {
    const aiConfig = await getAIClient(authSettings);
    const instruction = language === 'en'
        ? `Execute Action 1: Import (Parsing) according to SKILL.md. IMPORTANT: Preserve original paragraph breaks and bullets in descriptions. TEXT: ${text}`
        : `Execute a Fase 1: Importação (Parsing) conforme o SKILL.md. IMPORTANTE: Preserve quebras de parágrafo e bullets originais nas descrições. TEXTO: ${text}`;
    const { prompt, response } = await callAI(instruction, aiConfig, 'json_object', getAtsParserSkill(language), language);
    return { prompt, response: robustJsonParse(response) };
}

export async function parseResumeFromPDF(base64: string, authSettings?: AIAuthSettings, language: string = 'pt'): Promise<{ data?: Partial<ResumeData>; error?: string; prompt?: string; response?: string }> {
    try {
        const base64Data = base64.split(';base64,').pop();
        if (!base64Data) throw new Error('Dados Base64 inválidos ou vazios');

        // Note: pdf-parse expects a buffer. It is externalized in next.config.ts to avoid ENOENT bugs.
        const pdf = require('pdf-parse');
        const buffer = Buffer.from(base64Data, 'base64');

        logger.info('Starting PDF extraction...');
        const data = await pdf(buffer);

        if (!data || !data.text || data.text.trim().length === 0) {
            throw new Error('O PDF parece estar vazio ou não contém texto extraível.');
        }

        const aiConfig = await getAIClient(authSettings);
        const instruction = `Execute a Fase 1: Importação (Parsing) conforme o SKILL.md. IMPORTANTE: Preserve quebras de parágrafo e bullets originais nas descrições. TEXTO: ${data.text}`;

        logger.info('Calling AI for parsing...');
        const { prompt, response } = await callAI(instruction, aiConfig, 'json_object', getAtsParserSkill(), language);

        if (!response) throw new Error('A IA de extração retornou uma resposta vazia.');

        return { data: robustJsonParse(response), prompt, response };
    } catch (error: any) {
        logger.error('Error in parseResumeFromPDF', error);
        return { error: error.message || 'Erro interno no servidor' };
    }
}

export async function getSkillContent(language: string = 'pt'): Promise<string> {
    return getAtsAnalyzerSkill(language);
}

export async function getParserSkillContent(language: string = 'pt'): Promise<string> {
    return getAtsParserSkill(language);
}

export async function getResumeEditorSummaryContent(language: string = 'pt'): Promise<string> {
    return getResumeEditorSummarySkill(language);
}

export async function getResumeEditorRewriteContent(language: string = 'pt'): Promise<string> {
    return getResumeEditorRewriteSkill(language);
}

export async function getResumeEditorGrammarContent(language: string = 'pt'): Promise<string> {
    return getResumeEditorGrammarSkill(language);
}

export async function fetchAvailableModels(apiKey: string, baseUrl?: string): Promise<string[]> {
    if (!apiKey) return [];
    try {
        const res = await fetch(`${baseUrl || 'https://generativelanguage.googleapis.com/v1beta/'}models?key=${apiKey}`);
        const data = await res.json();
        return data.models.filter((m: any) => m.supportedGenerationMethods.includes('generateContent')).map((m: any) => m.name.replace('models/', '')).sort();
    } catch (error) { return []; }
}
