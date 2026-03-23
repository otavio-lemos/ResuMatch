import { getChatModel } from '../client';
import { createAnalyzerPrompt } from '../prompts';
import { getJsonFormatInstructions } from '../parsers';
import { ATSAnalysisSchema, ATSAnalysis } from '../types';
import { AISettings } from '@/store/useAISettingsStore';
import { z } from 'zod';

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
    
    // Get format instructions for JSON output
    const formatInstructions = getJsonFormatInstructions(ATSAnalysisSchema);
    const prompt = await createAnalyzerPrompt(language);
    
    const formatted = await prompt.format({
      resumeJson: JSON.stringify(resumeData, null, 2),
      jobDesc: safeJobDescription,
      formatInstr: formatInstructions
    });
    
    console.log('[analyzeATSChain] Starting invoke, prompt length:', formatted.length);
    
    // Use invoke for reliable response
    const invokeResponse = await model.invoke([
      { role: 'user', content: formatted }
    ]);
    
    const fullContent = typeof invokeResponse.content === 'string' 
      ? invokeResponse.content 
      : JSON.stringify(invokeResponse.content);
    
    yield { type: 'chunk', content: fullContent };
    
    console.log('[analyzeATSChain] Response length:', fullContent.length);
    
    // Parse with robust JSON handling and Zod validation
    try {
      const cleaned = fullContent
        .replace(/^```(\w+)?\s*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
      
      const parsed = JSON.parse(cleaned);
      const validated = ATSAnalysisSchema.parse(parsed);
      
      console.log('[analyzeATSChain] Parsing complete, keys:', Object.keys(validated));
      yield { type: 'done', data: validated };
      
    } catch (parseError) {
      console.warn('[analyzeATSChain] Parse failed, trying extraction:', parseError);
      
      // Fallback: extract JSON from text
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = ATSAnalysisSchema.parse(parsed);
        yield { type: 'done', data: validated };
      } else {
        throw new Error('No valid JSON found in response');
      }
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyzeATSChain] Error:', message);
    yield { type: 'error', error: message };
  }
}
