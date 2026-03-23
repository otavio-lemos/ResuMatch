'use server';

import OpenAI from 'openai';
import { ResumeData } from '@/store/useResumeStore';
import { AISettings } from '@/store/useAISettingsStore';
import { logger } from '@/lib/logger';
import { getAtsAnalyzerSkill, getAtsParserSkill, getAtsSummarySkill, getAtsRewriteSkill, getAtsGrammarSkill, getAtsAuditSkill, getJobComparisonSkill, getAtsUISkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getTranslation } from '@/hooks/useTranslation';
import { Language } from '@/lib/translations';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ResumeDataSchema, ATSAnalysisSchema } from '@/lib/ai/types';


export type AIAuthSettings = Partial<AISettings>;

export type AIConfig = 
    | { type: 'gemini'; apiKey: string; endpoint: string; temperature?: number; maxTokens?: number; topP?: number; topK?: number }
    | { type: 'openai'; client: OpenAI; model: string; temperature?: number; topP?: number; maxTokens?: number; stream?: boolean };

export const getAIClient = async (authSettings?: AIAuthSettings): Promise<AIConfig> => {
    const provider = authSettings?.provider || 'gemini';

    // 1. Tratamento Gemini (requer API Key)
    if (provider === 'gemini') {
        const apiKey = authSettings?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Configuração de IA não encontrada. Defina a chave API nas configurações (ícone de engrenagem) ou configure GEMINI_API_KEY no arquivo .env');
        
        // Se o usuário não definiu um modelo, usamos o flash como padrão seguro
        const model = authSettings?.model || 'gemini-2.5-pro';
        return {
            type: 'gemini' as const,
            apiKey: apiKey,
            endpoint: `${authSettings?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/'}models/${model}:generateContent`,
            temperature: authSettings?.temperature,
            maxTokens: authSettings?.maxTokens,
            topP: authSettings?.topP,
            topK: authSettings?.topK
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
            model: authSettings?.model || (provider === 'ollama' ? 'qwen3:8b' : 'gpt-3.5-turbo'),
            temperature: authSettings?.temperature,
            topP: authSettings?.topP,
            maxTokens: authSettings?.maxTokens,
            stream: provider === 'ollama'
        };
    }
};

async function callAIWithJsonParser(
    prompt: string, 
    aiConfig: AIConfig, 
    schema: any, 
    skill?: string, 
    language: string = 'pt'
): Promise<{ prompt: string; response: any; debug: { skill: string; userPrompt: string; rawResponse: string } }> {
    const systemInstruction = skill || getAtsAnalyzerSkill(language);
    
    try {
        let model: any;
        
        if (aiConfig.type === 'gemini') {
            model = new ChatGoogleGenerativeAI({
                model: aiConfig.endpoint.includes('gemini-2.0-flash') ? 'gemini-2.0-flash' : 
                      aiConfig.endpoint.includes('gemini-1.5') ? 'gemini-1.5-pro' : 'gemini-2.0-flash',
                apiKey: aiConfig.apiKey,
                temperature: aiConfig.temperature ?? 0.7,
                maxOutputTokens: aiConfig.maxTokens ?? 16384,
            });
        } else {
            const baseURL = (aiConfig.client as any).baseURL || 'https://api.openai.com/v1';
            model = new ChatOpenAI({
                model: aiConfig.model,
                temperature: aiConfig.temperature ?? 0.7,
                maxTokens: aiConfig.maxTokens ?? 16384,
                apiKey: (aiConfig.client as any).apiKey,
                configuration: { baseURL },
            });
        }
        
        const response = await model.invoke([
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
        ]);
        
        const rawContent = typeof response.content === 'string' 
            ? response.content 
            : JSON.stringify(response.content);
        
        // Use robustJsonParse for better error handling
        const parsed = robustJsonParse(rawContent);
        
        // Validate with schema if provided
        if (schema) {
            try {
                schema.parse(parsed);
            } catch (zodError) {
                console.warn('[callAIWithJsonParser] Schema validation warning:', zodError);
            }
        }
        
        return { 
            prompt, 
            response: parsed,
            debug: { skill: systemInstruction, userPrompt: prompt, rawResponse: rawContent }
        };
    } catch (error) {
        console.error('[callAIWithJsonParser] Error:', error);
        throw error;
    }
}

async function callAI(prompt: string, aiConfig: AIConfig, responseFormat?: 'json_object', skill?: string, language: string = 'pt'): Promise<{ prompt: string; response: string; debug: { skill: string; userPrompt: string; rawResponse: string } }> {
    // A Skill é OBRIGATÓRIA. Se não for passada, usamos o Analyzer como fallback padrão de segurança.
    const systemInstruction = skill || getAtsAnalyzerSkill(language);
    
    try {
        if (aiConfig.type === 'gemini') {
            const generationConfig: any = {
                temperature: aiConfig.temperature ?? 0.7,
                maxOutputTokens: aiConfig.maxTokens ?? 16384,
                responseMimeType: responseFormat === 'json_object' ? 'application/json' : 'text/plain',
            };
            
            // Adiciona topP e topK se estiverem definidos
            if (aiConfig.topP !== undefined) generationConfig.topP = aiConfig.topP;
            if (aiConfig.topK !== undefined) generationConfig.topK = aiConfig.topK;
            
            const res = await fetch(aiConfig.endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': aiConfig.apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    generationConfig,
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

                // Tratar erros específicos de quota e API
                if (res.status === 429 || errorDetails.toLowerCase().includes('quota') || errorDetails.toLowerCase().includes('exceeded')) {
                    throw new Error('Limite de uso da API excedido. Acesse Configurações (ícone de engrenagem) para alterar a chave API ou configurar um provedor alternativo.');
                }
                if (res.status === 403 || errorDetails.toLowerCase().includes('permission') || errorDetails.toLowerCase().includes('forbidden')) {
                    throw new Error('API Key sem permissão. Verifique as configurações da sua chave API no Google AI Studio.');
                }
                if (res.status === 400 || errorDetails.toLowerCase().includes('api key')) {
                    throw new Error('API Key inválida. Verifique a chave nas configurações (ícone de engrenagem).');
                }

                throw new Error(errorDetails);
            }
            const data = await res.json();
            const response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return { 
                prompt, 
                response,
                debug: { skill: systemInstruction, userPrompt: prompt, rawResponse: response }
            };
        } else {
            // Check if streaming is requested (for Ollama/OpenAI)
            const useStream = (aiConfig as any).stream === true;
            
            const streamOptions: any = {
                model: aiConfig.model,
                messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }],
            };
            
            // Adiciona parâmetros apenas se estiverem definidos
            if (aiConfig.temperature !== undefined) streamOptions.temperature = aiConfig.temperature;
            if (aiConfig.topP !== undefined) streamOptions.top_p = aiConfig.topP;
            if (aiConfig.maxTokens !== undefined) streamOptions.max_tokens = aiConfig.maxTokens;
            if (responseFormat) streamOptions.response_format = { type: responseFormat };
            
            let response = '';
            
            if (useStream) {
                streamOptions.stream = true;
                const stream: any = await aiConfig.client.chat.completions.create(streamOptions);
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    response += content;
                }
            } else {
                const responseObj = await aiConfig.client.chat.completions.create(streamOptions);
                const firstChoice = responseObj.choices?.[0];
                if (!firstChoice) {
                    throw new Error('A IA não retornou nenhuma escolha.');
                }
                response = firstChoice.message?.content || '';
            }
            
            return { 
                prompt, 
                response,
                debug: { skill: systemInstruction, userPrompt: prompt, rawResponse: response }
            };
        }
    } catch (error: any) {
        logger.error('AI Call failed', error);
        throw error;
    }
}

const getLanguageInstruction = (language: string) => language === 'en'
    ? 'CRITICAL INSTRUCTION: Your entire response MUST be in ENGLISH. All labels, feedback, suggestions, and JSON keys MUST be in English. FAILURE TO COMPLY WILL RESULT IN INCORRECT OUTPUT.'
    : 'CRITICAL INSTRUCTION: Responda APENAS em português. Todas as etiquetas, feedbacks e sugestões DEVEM estar em português. FALHA EM OBEDECER IRÁ RESULTAR EM SAÍDA INCORRETA.';

export async function rewriteText(text: string, authSettings?: AIAuthSettings & { rewritePrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const safeText = typeof text === 'string' ? text : String(text || '');
    if (!safeText.trim()) return { prompt: '', response: '' };
    const aiConfig = await getAIClient(authSettings);
    const cleanText = safeText.replace(/[{}]/g, '');
    const userPrompt = authSettings?.rewritePrompt ? `USER INSTRUCTION: ${authSettings.rewritePrompt}\n\n` : '';
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}EXECUTE ACTION 2: REWRITE (STAR) for this content: "${cleanText}"`;
    // USA A SKILL DE REWRITE (SSSTTTAAARRRREEWWWRRRIIITTTEEE)
    return callAI(finalPrompt, aiConfig, undefined, getAtsRewriteSkill(language), language);
}

export async function correctGrammar(text: string, authSettings?: AIAuthSettings & { grammarPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const safeText = typeof text === 'string' ? text : String(text || '');
    if (!safeText.trim()) return { prompt: '', response: '' };
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.grammarPrompt ? `USER INSTRUCTION: ${authSettings.grammarPrompt}\n\n` : '';
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}EXECUTE ACTION 3: CORRECT GRAMMAR for this content: "${safeText}"`;
    // USA A SKILL DE GRAMMAR (GGGRRRAAAMMMMMMAAARRRR)
    return callAI(finalPrompt, aiConfig, undefined, getAtsGrammarSkill(language), language);
}

export async function generateSummaryAI(resumeData: ResumeData, authSettings?: AIAuthSettings & { summaryPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: string }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.summaryPrompt ? `USER INSTRUCTION: ${authSettings.summaryPrompt}\n\n` : '';
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}EXECUTE ACTION 1: GENERATE SUMMARY for this data: ${JSON.stringify(resumeData)}`;
    // USA A SKILL DE SUMMARY (SSSUMMMMAAARRRYYY)
    return callAI(finalPrompt, aiConfig, undefined, getAtsSummarySkill(language), language);
}

export async function generateSkillsAI(resumeData: ResumeData, authSettings?: AIAuthSettings & { skillsPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: { category: string; skills: string[] }[] }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.skillsPrompt ? `USER INSTRUCTION: ${authSettings.skillsPrompt}\n\n` : '';
    
    const resumeDataJson = JSON.stringify({
        summary: resumeData.summary,
        experiences: resumeData.experiences,
        education: resumeData.education,
        projects: resumeData.projects,
        languages: resumeData.languages
    }, null, 2);
    
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}
RESUME DATA TO ANALYZE:
${resumeDataJson}

EXECUTE ACTION: EXTRACT SKILLS from the resume data above. IMPORTANT: Separate skills into exactly two categories:
1. "Hard Skills" (type: "hard") - Technical skills: programming languages, frameworks, tools, cloud, databases, certifications, languages
2. "Soft Skills" (type: "soft") - Behavioral skills: leadership, communication, teamwork, problem solving, time management, etc.
Return JSON array with format: [{"category": "Hard Skills", "type": "hard", "skills": ["Skill1", "Skill2", ...]}, {"category": "Soft Skills", "type": "soft", "skills": ["Skill1", "Skill2", ...]}]`;
    
    const { response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsSummarySkill(language), language);
    const parsed = robustJsonParse(response);
    return { prompt: finalPrompt, response: Array.isArray(parsed) ? parsed : [] };
}

export async function generateATSAnalysis(resumeData: ResumeData, jobDescription?: string, authSettings?: AIAuthSettings & { atsPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: any; debug: { skill: string; userPrompt: string; rawResponse: string } }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.atsPrompt ? `USER INSTRUCTION: ${authSettings.atsPrompt}\n\n` : '';
    const jdString = typeof jobDescription === 'string' ? jobDescription : '';
    const jobInfo = jdString ? `JOB DESCRIPTION: ${jdString}\n\n` : '';
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}${jobInfo}EXECUTE ACTION 2 (AUDIT) for this data: ${JSON.stringify(resumeData)}`;
    // OBRIGATORIAMENTE USA A SKILL FASE 2 (AUDITORIA)
    try {
        const result = await callAIWithJsonParser(finalPrompt, aiConfig, ATSAnalysisSchema, getAtsAnalyzerSkill(language), language);
        return { prompt: result.prompt, response: result.response, debug: result.debug };
    } catch (error) {
        console.error('[generateATSAnalysis] JsonOutputParser failed, using fallback:', error);
        const { prompt, response, debug } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsAnalyzerSkill(language), language);
        return { prompt, response: robustJsonParse(response), debug };
    }
}

export async function translateResumeData(data: ResumeData, targetLang: 'pt' | 'en', authSettings?: AIAuthSettings): Promise<{ prompt: string; response: ResumeData }> {
    const aiConfig = await getAIClient(authSettings);
    const prompt = `${getLanguageInstruction(targetLang)}\n\nTraduza este currículo JSON para ${targetLang}. Mantenha a estrutura JSON: ${JSON.stringify(data)}`;
    // Usa a skill de escrita para tradução profissional
    const { response } = await callAI(prompt, aiConfig, 'json_object', getAtsSummarySkill(targetLang), targetLang);
    return { prompt, response: robustJsonParse(response) };
}

export async function parseResumeFromText(text: string, authSettings?: AIAuthSettings & { importPrompt?: string }, language: string = 'pt'): Promise<{ prompt: string; response: Partial<ResumeData> }> {
    const aiConfig = await getAIClient(authSettings);
    const userPrompt = authSettings?.importPrompt ? `USER INSTRUCTION: ${authSettings.importPrompt}\n\n` : '';
    const finalPrompt = `${getLanguageInstruction(language)}\n\n${userPrompt}EXECUTE ACTION 1: IMPORT (PARSING) for this content: ${text}`;
    
    let parsedData: any;
    
    // OBRIGATORIAMENTE USA A SKILL FASE 1 (IMPORTAÇÃO)
    try {
        const result = await callAIWithJsonParser(finalPrompt, aiConfig, ResumeDataSchema, getAtsParserSkill(language), language);
        parsedData = result.response;
    } catch (error) {
        console.error('[parseResumeFromText] JsonOutputParser failed, using fallback:', error);
        const { prompt, response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsParserSkill(language), language);
        parsedData = robustJsonParse(response);
    }
    
    // Normalize line breaks in summary and descriptions
    if (parsedData) {
        if (parsedData.summary && typeof parsedData.summary === 'string') {
            let summary = parsedData.summary;
            // Fix ". , " pattern
            summary = summary.replace(/\.\s*,/g, '.');
            
            // Handle all escape variations of \n
            summary = summary
                .replace(/\\n\\n/g, '\n\n')
                .replace(/\\n/g, '\n')
                .replace(/\\\\n/g, '\n');
            
            // If still no line breaks, try to split by sentences (including accented)
            if (!summary.includes('\n')) {
                summary = summary
                    .replace(/\. ([A-ZÀ-Ú])/g, '.\n\n$1')
                    .replace(/;\s*([A-ZÀ-Ú])/g, ';\n\n$1');
            }
            
            // Ensure double line breaks for paragraphs
            summary = summary.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
            
            parsedData.summary = summary;
        }
        
        ['experiences', 'education', 'projects'].forEach((section: string) => {
            if (Array.isArray(parsedData[section])) {
                parsedData[section].forEach((item: any) => {
                    if (Array.isArray(item.description)) {
                        const fixedBullets = item.description.map((d: string) => {
                            let fixed = d.replace(/\.\s*,/g, '.');
                            // Handle all escape variations
                            fixed = fixed
                                .replace(/\\n\\n/g, '\n\n')
                                .replace(/\\n/g, '\n')
                                .replace(/\\\\n/g, '\n');
                            return fixed.startsWith('-') || fixed.startsWith('•') ? fixed : `- ${fixed}`;
                        });
                        item.description = fixedBullets.join('\n');
                    } else if (typeof item.description === 'string') {
                        let desc = item.description;
                        desc = desc.replace(/\.\s*,/g, '.');
                        desc = desc
                            .replace(/\\n\\n/g, '\n\n')
                            .replace(/\\n/g, '\n')
                            .replace(/\\\\n/g, '\n');

                        // If still no line breaks, force split by period-space (any letter)
                        if (!desc.includes('\n')) {
                            desc = desc
                                .replace(/\. ([a-zA-ZÀ-ú])/g, '.\n- $1')
                                .replace(/; ([a-zA-ZÀ-ú])/g, ';\n- $1')
                                .replace(/\.\s*$/, '.');
                        }

                        item.description = desc;
                    }
                });
            }
        });
    }
    
    return { prompt: finalPrompt, response: parsedData };
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
        let parsedData: any;
        
        try {
            const result = await callAIWithJsonParser(finalPrompt, aiConfig, ResumeDataSchema, getAtsParserSkill(language), language);
            if (!result.response) throw new Error('A IA de extração retornou uma resposta vazia.');
            parsedData = result.response;
        } catch (parseError) {
            console.error('[parseResumeFromPDF] JsonOutputParser failed, using fallback:', parseError);
            const { prompt, response } = await callAI(finalPrompt, aiConfig, 'json_object', getAtsParserSkill(language), language);
            if (!response) throw new Error('A IA de extração retornou uma resposta vazia.');
            parsedData = robustJsonParse(response);
        }
        
        // Normalize line breaks in summary and descriptions
        if (parsedData) {
            if (parsedData.summary && typeof parsedData.summary === 'string') {
                let summary = parsedData.summary;
                // Fix ". , " pattern
                summary = summary.replace(/\.\s*,/g, '.');
                
                // Handle all escape variations of \n
                summary = summary
                    .replace(/\\n\\n/g, '\n\n')
                    .replace(/\\n/g, '\n')
                    .replace(/\\\\n/g, '\n');
                
                // If still no line breaks, try to split by sentences (including accented)
                if (!summary.includes('\n')) {
                    summary = summary
                        .replace(/\. ([A-ZÀ-Ú])/g, '.\n\n$1')
                        .replace(/;\s*([A-ZÀ-Ú])/g, ';\n\n$1');
                }
                
                // Ensure double line breaks for paragraphs
                summary = summary.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
                
                parsedData.summary = summary;
            }
            
            ['experiences', 'education', 'projects'].forEach((section: string) => {
                if (Array.isArray(parsedData[section])) {
                    parsedData[section].forEach((item: any) => {
                        if (Array.isArray(item.description)) {
                            const fixedBullets = item.description.map((d: string) => {
                                let fixed = d.replace(/\.\s*,/g, '.');
                                // Handle all escape variations
                                fixed = fixed
                                    .replace(/\\n\\n/g, '\n\n')
                                    .replace(/\\n/g, '\n')
                                    .replace(/\\\\n/g, '\n');
                                return fixed.startsWith('-') || fixed.startsWith('•') ? fixed : `- ${fixed}`;
                            });
                            item.description = fixedBullets.join('\n');
                        } else if (typeof item.description === 'string') {
                            let desc = item.description;
                            desc = desc.replace(/\.\s*,/g, '.');
                            desc = desc
                                .replace(/\\n\\n/g, '\n\n')
                                .replace(/\\n/g, '\n')
                                .replace(/\\\\n/g, '\n');

                            // If still no line breaks, force split by period-space (any letter)
                            if (!desc.includes('\n')) {
                                desc = desc
                                    .replace(/\. ([a-zA-ZÀ-ú])/g, '.\n- $1')
                                    .replace(/; ([a-zA-ZÀ-ú])/g, ';\n- $1')
                                    .replace(/\.\s*$/, '.');
                            }

                            item.description = desc;
                        }
                    });
                }
            });
        }
        
        return { data: parsedData };
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
    return getAtsRewriteSkill(language);
}

export async function getResumeEditorGrammarContent(language: string = 'pt'): Promise<string> {
    return getAtsGrammarSkill(language);
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