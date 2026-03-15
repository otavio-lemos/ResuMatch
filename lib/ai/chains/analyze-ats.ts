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
  const safeAiSettings = aiSettings || {};
  
  try {
    console.log('[analyzeATSChain] Getting chat model...');
    const model = getChatModel(safeAiSettings);
    console.log('[analyzeATSChain] Model obtained, creating prompt...');
    const prompt = await createAnalyzerPrompt(language);
    const formatInstructions = getJsonFormatInstructions(ATSAnalysisSchema);
    
    const formatted = await prompt.format({
      resumeJson: JSON.stringify(resumeData, null, 2),
      jobDesc: jobDescription || '',
      formatInstr: formatInstructions
    });
    
    console.log('[analyzeATSChain] Starting stream, prompt length:', formatted.length);
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    console.log('[analyzeATSChain] Stream complete, content length:', fullContent.length);
    
    const parsed = parseATSAnalysis(fullContent);
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyzeATSChain] Error:', message);
    yield { type: 'error', error: message };
  }
}
