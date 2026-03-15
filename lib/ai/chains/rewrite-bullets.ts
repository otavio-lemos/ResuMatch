import { getChatModel, streamAI } from '../client';
import { createRewritePrompt } from '../prompts';
import { AISettings } from '@/store/useAISettingsStore';

export interface RewriteBulletsInput {
  bulletContent: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* rewriteBulletsChain(input: RewriteBulletsInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: string; error?: string }> {
  const { bulletContent, language, aiSettings } = input;
  
  try {
    const model = getChatModel(aiSettings);
    const prompt = await createRewritePrompt(language);
    
    const formatted = await prompt.format({ bulletContent });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    yield { type: 'done', data: fullContent };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}
