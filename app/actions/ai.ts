'use server';

import OpenAI from 'openai';
import { ResumeData } from '@/store/useResumeStore';
import { AISettings } from '@/store/useAISettingsStore';
import { logger } from '@/lib/logger';
import { getAtsAnalyzerSkill, getAtsParserSkill, getAtsSummarySkill, getAtsAuditSkill, getJobComparisonSkill, getAtsUISkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getTranslation } from '@/hooks/useTranslation';
import { Language } from '@/lib/translations';


export type AIAuthSettings = Partial<AISettings>;

export type AIConfig = 
    | { type: 'gemini'; apiKey: string; endpoint: string; temperature: number; maxTokens: number }
    | { type: 'openai'; client: OpenAI; model: string; temperature: number; maxTokens: number };

export const getAIClient = async (authSettings?: AIAuthSettings): Promise<AIConfig> => {
    const provider = authSettings?.provider || 'gemini';

    // 1. Tratamento Gemini (requer API Key)
    if (provider === 'gemini') {
        const apiKey = authSettings?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Configuração de IA não encontrada. Defina a chave API nas configurações (ícone de engrenagem) ou configure GEMINI_API_KEY no arquivo .env');
        
        // Se o usuário não definiu um modelo, usamos o flash como padrão seguro
        const model = authSettings?.model || 'gemini-2.5-flash';
        return {
            type: 'gemini' as const,
            apiKey: apiKey,
            endpoint: `${authSettings?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/'}models/${model}:generateContent`,
            temperature: authSettings?.temperature ?? 0.1,
            maxTokens: authSettings?.maxTokens ?? 16384
        };
    } 
    
    // 2. Tratamento OpenAI/Ollama (OpenAI Compatível)
    else {
        // Permite chave vazia para Ollama
        const apiKey = authSettings?.apiKey || (provider === 'ollama' ? 'ollama' : '');
        
        // URL padrão baseada no provedor
        // Detecta automaticamente: se baseUrl não for fornecida, usa localhost (local) ou host.docker.internal (Docker)
        const isRunningInDocker = process.env.DOCKER_CONTAINER === 'true';
        const defaultOllamaUrl = isRunningInDocker 
            ? 'http://host.docker.internal:11434/v1' 
            : 'http://localhost:11434/v1';
            
        const defaultUrl = provider === 'ollama' 
            ? defaultOllamaUrl
            : 'https://api.openai.com/v1';
            
        const baseURL = authSettings?.baseUrl || defaultUrl;

        return {
            type: 'openai' as const,
            client: new OpenAI({ baseURL, apiKey }),
            model: authSettings?.model || (provider === 'ollama' ? 'llama3.2:3b' : 'gpt-3.5-turbo'),
            temperature: authSettings?.temperature ?? 0.1,
            maxTokens: authSettings?.maxTokens ?? 4096
        };
    }
};

async function callAI(prompt: string, aiConfig: AIConfig, responseFormat?: 'json_object', skill?: string, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    // A Skill é OBRIGATÓRIA. Se não for passada, usamos o Analyzer como fallback padrão de segurança.
    const systemInstruction = skill || getAtsAnalyzerSkill(language);
    
    try {
        if (aiConfig.type === 'gemini') {
            const res = await fetch(aiConfig.endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': aiConfig.apiKey
                },
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
                let errorDetails = '';
                try {
                    const errorJson = await res.json();
                    errorDetails = errorJson.error?.message || res.statusText;
                } catch (e) {
                    errorDetails = res.statusText || res.status.toString();
                }

                throw new Error(errorDetails);
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
            const firstChoice = response.choices?.[0];
            if (!firstChoice) {
                throw new Error('A IA não retornou nenhuma escolha.');
            }
            return { prompt, response: firstChoice.message?.content || '' };
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
    const userPrompt = authSettings?.rewritePrompt ? `USER INSTRUCTION: ${authSettings.rewritePrompt}\n\n` : '';
    const finalPrompt = `${userPrompt}EXECUTE ACTION 2: REWRITE (STAR) for this content: "${safeText}"`;
    // OBRIGATORIAMENTE USA A SKILL FASE 3 (EDITOR)
    return callAI(finalPrompt, aiConfig, undefined, getAtsSummarySkill(language), language);
}

export async function correctGrammar(text: string, authSettings?: AIAuthSettings & { grammarPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    if (!text?.trim()) return { prompt: '', response: '' };
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.grammarPrompt ? `USER INSTRUCTION: ${authSettings.grammarPrompt}\n\n` : '';
    const finalPrompt = `${userPrompt}EXECUTE ACTION 3: CORRECT GRAMMAR for this content: "${text}"`;
    // OBRIGATORIAMENTE USA A SKILL FASE 3 (EDITOR)
    return callAI(finalPrompt, aiConfig, undefined, getAtsSummarySkill(language), language);
}

export async function generateSummaryAI(resumeData: ResumeData, authSettings?: AIAuthSettings & { summaryPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.summaryPrompt ? `USER INSTRUCTION: ${authSettings.summaryPrompt}\n\n` : '';
    const finalPrompt = `${userPrompt}EXECUTE ACTION 1: GENERATE SUMMARY for this data: ${JSON.stringify(resumeData)}`;
    // OBRIGATORIAMENTE USA A SKILL FASE 3 (EDITOR)
    return callAI(finalPrompt, aiConfig, undefined, getAtsSummarySkill(language), language);
}

export async function generateATSAnalysis(resumeData: ResumeData, jobDescription?: string, authSettings?: AIAuthSettings & { atsPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: any }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.atsPrompt ? `USER INSTRUCTION: ${authSettings.atsPrompt}\n\n` : '';
    const jobInfo = jobDescription ? `JOB DESCRIPTION: ${jobDescription}\n\n` : '';
    const finalPrompt = `${userPrompt}${jobInfo}EXECUTE ACTION 2 (AUDIT) for this data: ${JSON.stringify(resumeData)}`;
    // OBRIGATORIAMENTE USA A SKILL FASE 2 (AUDITORIA)
    const { prompt, response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsAnalyzerSkill(language), language);
    return { prompt, response: robustJsonParse(response) };
}

export async function translateResumeData(data: ResumeData, targetLang: 'pt' | 'en', authSettings?: AIAuthSettings): Promise<{ prompt: string; response: ResumeData }> {
    const aiConfig = await getAIClient(authSettings);
    const prompt = `Traduza este currículo JSON para ${targetLang}. Mantenha a estrutura JSON: ${JSON.stringify(data)}`;
    // Usa a skill de escrita para tradução profissional
    const { response } = await callAI(prompt, aiConfig, 'json_object', getAtsSummarySkill(targetLang), targetLang);
    return { prompt, response: robustJsonParse(response) };
}

export async function parseResumeFromText(text: string, authSettings?: AIAuthSettings & { importPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: Partial<ResumeData> }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.importPrompt ? `USER INSTRUCTION: ${authSettings.importPrompt}\n\n` : '';
    const finalPrompt = `${userPrompt}EXECUTE ACTION 1: IMPORT (PARSING) for this content: ${text}`;
    // OBRIGATORIAMENTE USA A SKILL FASE 1 (IMPORTAÇÃO)
    const { prompt, response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsParserSkill(language), language);
    return { prompt, response: robustJsonParse(response) };
}

export async function parseResumeFromPDF(base64: string, authSettings?: AIAuthSettings & { importPrompt?: string }, language: string = 'pt'): Promise<{ data?: Partial<ResumeData>; error?: string; prompt?: string; response?: string }> {
    try {
        const base64Data = base64.split(';base64,').pop();
        if (!base64Data) throw new Error('Dados Base64 inválidos ou vazios');

        const pdf = require('pdf-parse');
        const buffer = Buffer.from(base64Data, 'base64');
        const data = await pdf(buffer);

        if (!data || !data.text || data.text.trim().length === 0) {
            throw new Error('O PDF parece estar vazio ou não contém texto extraível.');
        }

        const aiConfig = await getAIClient(authSettings);
        const userPrompt = authSettings?.importPrompt ? `USER INSTRUCTION: ${authSettings.importPrompt}\n\n` : '';
        const finalPrompt = `${userPrompt}EXECUTE ACTION 1: IMPORT (PARSING) for this content: ${data.text}`;

        // OBRIGATORIAMENTE USA A SKILL FASE 1 (IMPORTAÇÃO)
        const { prompt, response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsParserSkill(language), language);

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
    return getAtsSummarySkill(language);
}

export async function getResumeEditorRewriteContent(language: string = 'pt'): Promise<string> {
    return getAtsSummarySkill(language);
}

export async function getResumeEditorGrammarContent(language: string = 'pt'): Promise<string> {
    return getAtsSummarySkill(language);
}

export async function getAuditSkillContent(language: string = 'pt'): Promise<string> {
    return getAtsAuditSkill(language);
}

export async function getJobComparisonSkillContent(language: string = 'pt'): Promise<string> {
    return getJobComparisonSkill(language);
}

export async function getUiSkillContent(language: string = 'pt'): Promise<string> {
    return getAtsUISkill(language);
}

export async function fetchAvailableModels(apiKey: string, baseUrl?: string): Promise<string[]> {
    if (!apiKey) return [];
    try {
        const res = await fetch(`${baseUrl || 'https://generativelanguage.googleapis.com/v1beta/'}models`, {
            headers: {
                'x-goog-api-key': apiKey
            }
        });
        const data = await res.json();
        return data.models.filter((m: any) => m.supportedGenerationMethods.includes('generateContent')).map((m: any) => m.name.replace('models/', '')).sort();
    } catch (error) { return []; }
}