import { getChatModel } from '../client';
import { ATSAnalysisSchema } from '../types';
import { AISettings } from '@/store/useAISettingsStore';

export interface AnalyzeATSInput {
  resumeData: any;
  jobDescription?: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
  appWordCount?: number;
}

function tryParseJSON(text: string): any | null {
  const strategies = [
    () => text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim(),
    () => {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return text.substring(start, end + 1);
      }
      return text;
    },
    () => text.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
  ];

  for (const strategy of strategies) {
    try {
      const cleaned = strategy();
      return JSON.parse(cleaned);
    } catch (e) {
      continue;
    }
  }
  return null;
}

export async function* analyzeATSChain(input: AnalyzeATSInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeData, jobDescription, language, aiSettings, appWordCount } = input;
  
  const safeJobDescription = typeof jobDescription === 'string' ? jobDescription : '';
  
  const safeAiSettings = {
    ...aiSettings,
    maxTokens: Math.max(aiSettings?.maxTokens || 16384, 16384)
  };

  console.log('[analyzeATSChain] ========== CONFIGURAÇÕES DO MODELO ==========');
  console.log('[analyzeATSChain] Provider:', safeAiSettings.provider);
  console.log('[analyzeATSChain] Model:', safeAiSettings.model);
  console.log('[analyzeATSChain] API Key:', safeAiSettings.apiKey ? '***' + safeAiSettings.apiKey.slice(-4) : 'not set');
  console.log('[analyzeATSChain] Base URL:', safeAiSettings.baseUrl);
  console.log('[analyzeATSChain] Temperature:', safeAiSettings.temperature);
  console.log('[analyzeATSChain] Top P:', safeAiSettings.topP);
  console.log('[analyzeATSChain] Top K:', safeAiSettings.topK);
  console.log('[analyzeATSChain] Max Tokens:', safeAiSettings.maxTokens);
  console.log('[analyzeATSChain] Language:', language);
  console.log('[analyzeATSChain] =============================================');
  
  try {
    const model = getChatModel(safeAiSettings);
    
    const analyzerSkill = require('@/lib/get-skill').getAtsAnalyzerSkill(language);
    const languageInstruction = language === 'pt'
      ? 'Responda APENAS em português.'
      : 'Respond ONLY in English.';
    
    const prompt = `
${analyzerSkill}

${languageInstruction}

RESUME_DATA:
${JSON.stringify(resumeData, null, 2)}

${safeJobDescription ? `JOB_DESCRIPTION:\n${safeJobDescription}` : ''}

Respond with valid JSON only. No markdown fences.
`;
    
    console.log('[analyzeATSChain] Starting invoke...');
    
    console.log('[analyzeATSChain] ========== SKILL ==========');
    console.log(analyzerSkill);
    console.log('[analyzeATSChain] ========== END SKILL ==========');
    
    console.log('[analyzeATSChain] ========== FULL PROMPT ==========');
    console.log(prompt);
    console.log('[analyzeATSChain] ========== END PROMPT ==========');
    
    const invokeResponse = await model.invoke([
      { role: 'user', content: prompt }
    ]);
    
    let fullContent = typeof invokeResponse.content === 'string' 
      ? invokeResponse.content 
      : JSON.stringify(invokeResponse.content);
    
    console.log('[analyzeATSChain] ========== RAW AI RESPONSE ==========');
    console.log(fullContent);
    console.log('[analyzeATSChain] ========== END AI RESPONSE ==========');
    
    yield { type: 'chunk', content: fullContent };
    
    console.log('[analyzeATSChain] Response length:', fullContent.length);
    
    let parsed = tryParseJSON(fullContent);
    
    if (appWordCount !== undefined && parsed) {
      const metrics = parsed.contentMetrics || parsed.conteudoMetrics;
      if (metrics?.wordCount) {
        console.log('[analyzeATSChain] Overriding wordCount:', metrics.wordCount.value, '→', appWordCount);
        metrics.wordCount.value = appWordCount;
      }
    }
    
    if (parsed) {
      try {
        const validated = ATSAnalysisSchema.parse(parsed);
        console.log('[analyzeATSChain] Parsing complete, keys:', Object.keys(validated));
        yield { type: 'done', data: validated };
        return;
      } catch (e) {
        console.warn('[analyzeATSChain] Schema validation failed:', e);
      }
    }
    
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = tryParseJSON(jsonMatch[0]);
      if (parsed) {
        const validated = ATSAnalysisSchema.parse(parsed);
        yield { type: 'done', data: validated };
        return;
      }
    }
    
    throw new Error('Failed to parse JSON from model response');
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyzeATSChain] Error:', message);
    yield { type: 'error', error: message };
  }
}
