import { getChatModel, streamAI } from '../client';
import { createAnalyzerPrompt } from '../prompts';
import { parseATSAnalysis, getJsonFormatInstructions } from '../parsers';
import { ATSAnalysisSchema } from '../types';
import { AISettings } from '@/store/useAISettingsStore';

export interface AnalyzeATSInput {
  resumeData: any;
  jobDescription?: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* analyzeATSChain(input: AnalyzeATSInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeData, jobDescription, language, aiSettings } = input;
  
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
    const prompt = await createAnalyzerPrompt(language);
    const formatInstructions = getJsonFormatInstructions(ATSAnalysisSchema);
    
    const formatted = await prompt.format({
      resumeJson: JSON.stringify(resumeData, null, 2),
      jobDesc: safeJobDescription,
      formatInstr: formatInstructions
    });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    const parsed = parseATSAnalysis(fullContent);
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyzeATSChain] Error:', message);
    yield { type: 'error', error: message };
  }
}
