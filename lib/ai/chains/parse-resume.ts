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
  
  try {
    const model = getChatModel(aiSettings);
    const prompt = await createParserPrompt(language);
    const formatInstructions = getJsonFormatInstructions(ResumeDataSchema);
    
    const formatted = await prompt.format({
      resumeContent,
      formatInstructions
    });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    const parsed = parseResume(fullContent);
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}
