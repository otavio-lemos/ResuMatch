import { getChatModel, streamAI } from '../client';
import { createParserPrompt } from '../prompts';
import { parseResume, getJsonFormatInstructions } from '../parsers';
import { ResumeDataSchema } from '../types';
import { AISettings } from '@/store/useAISettingsStore';

export interface ParseResumeInput {
  resumeContent: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* parseResumeChain(input: ParseResumeInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeContent, language, aiSettings } = input;
  const safeAiSettings = aiSettings || {};
  
  try {
    console.log('[parseResumeChain] Getting chat model...');
    const model = getChatModel(safeAiSettings);
    console.log('[parseResumeChain] Model obtained, creating prompt...');
    const prompt = await createParserPrompt(language);
    const formatInstructions = getJsonFormatInstructions(ResumeDataSchema);
    
    const formatted = await prompt.format({
      resumeContent,
      formatInstructions
    });
    
    console.log('[parseResumeChain] Starting stream, formatted prompt length:', formatted.length);
    
    let fullContent = '';
    let chunkCount = 0;
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      chunkCount++;
      if (chunkCount % 100 === 0) {
        console.log('[parseResumeChain] Chunk count:', chunkCount, 'content length:', fullContent.length);
      }
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    console.log('[parseResumeChain] Stream complete, total chunks:', chunkCount, 'total length:', fullContent.length);
    
    console.log('[parseResumeChain] Parsing content...');
    const parsed = parseResume(fullContent);
    console.log('[parseResumeChain] Parsing complete, keys:', Object.keys(parsed));
    
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parseResumeChain] Error:', message);
    yield { type: 'error', error: message };
  }
}
