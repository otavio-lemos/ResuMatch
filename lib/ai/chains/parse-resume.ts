import { getChatModel } from '../client';
import { createParserPrompt } from '../prompts';
import { getJsonFormatInstructions } from '../parsers';
import { ResumeDataSchema } from '../types';
import { AISettings } from '@/store/useAISettingsStore';
import { z } from 'zod';
import { ResumeData } from '../types';

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
    
    // Define tool for structured output - LangChain recommended approach
    const resumeTool = {
      name: 'parse_resume',
      description: 'Parse and extract resume data from the provided content',
      parameters: ResumeDataSchema,
    };
    
    const prompt = await createParserPrompt(language);
    const formatInstructions = getJsonFormatInstructions(ResumeDataSchema);
    const formatted = await prompt.format({
      resumeContent,
      formatInstructions
    });
    
    console.log('[parseResumeChain] Starting stream, prompt length:', formatted.length);
    
    // Stream content for UI feedback - use invoke for reliable tool calling
    const invokeResponse = await model.invoke([
      { role: 'user', content: formatted }
    ]);
    
    let fullContent = '';
    let content = typeof invokeResponse.content === 'string' 
      ? invokeResponse.content 
      : JSON.stringify(invokeResponse.content);
    
    fullContent = content;
    yield { type: 'chunk', content };
    
    console.log('[parseResumeChain] Response length:', fullContent.length);
    
    // Use robust JSON parsing with Zod validation
    try {
      // First try direct JSON parse
      const cleaned = fullContent
        .replace(/^```(\w+)?\s*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
      
      const parsed = JSON.parse(cleaned);
      
      // Validate with Zod schema
      const validated = ResumeDataSchema.parse(parsed);
      console.log('[parseResumeChain] Parsing complete, keys:', Object.keys(validated));
      
      // Normalize line breaks in summary and descriptions
      if (validated) {
        if ((validated as any).summary && typeof (validated as any).summary === 'string') {
          let summary = (validated as any).summary;
          summary = summary.replace(/\.\s*,/g, '.');
          summary = summary
            .replace(/\\n\\n/g, '\n\n')
            .replace(/\\n/g, '\n')
            .replace(/\\\\n/g, '\n');
          if (!summary.includes('\n')) {
            summary = summary
              .replace(/\. ([A-ZÀ-Ú])/g, '.\n\n$1')
              .replace(/;\s*([A-ZÀ-Ú])/g, ';\n\n$1');
          }
          summary = summary.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
          (validated as any).summary = summary;
        }

        ['experiences', 'education', 'projects'].forEach((section: string) => {
          if (Array.isArray((validated as any)[section])) {
            (validated as any)[section].forEach((item: any) => {
              if (Array.isArray(item.description)) {
                const fixedBullets = item.description.map((d: string) => {
                  let fixed = d.replace(/\.\s*,/g, '.');
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
      
      yield { type: 'done', data: validated };
      
    } catch (parseError) {
      // Fallback: try to extract JSON from text
      console.warn('[parseResumeChain] Parse failed, trying extraction:', parseError);
      
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = ResumeDataSchema.parse(parsed);
          // Normalize line breaks
          if (validated) {
            if ((validated as any).summary && typeof (validated as any).summary === 'string') {
              let s = (validated as any).summary;
              s = s.replace(/\\n/g, '\n').replace(/\\n\\n/g, '\n\n');
              if (!s.includes('\n')) s = s.replace(/\. ([A-ZÀ-Ú])/g, '.\n\n$1');
              (validated as any).summary = s;
            }
            ['experiences', 'education', 'projects'].forEach((sec: string) => {
              if (Array.isArray((validated as any)[sec])) {
                (validated as any)[sec].forEach((item: any) => {
                  if (Array.isArray(item.description)) {
                    item.description = item.description.map((d: string) => {
                      let f = d.replace(/\\n/g, '\n');
                      return f.startsWith('-') || f.startsWith('•') ? f : `- ${f}`;
                    }).join('\n');
                  } else if (typeof item.description === 'string' && !item.description.includes('\n')) {
                    item.description = item.description
                      .replace(/\. ([a-zA-ZÀ-ú])/g, '.\n- $1')
                      .replace(/; ([a-zA-ZÀ-ú])/g, ';\n- $1');
                  }
                });
              }
            });
          }
          yield { type: 'done', data: validated };
        } catch (e) {
          throw new Error(`Failed to parse resume: ${e}`);
        }
      } else {
        throw new Error('No valid JSON found in response');
      }
    }
    
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parseResumeChain] Error:', rawMessage);
    
    // Check for quota exceeded / rate limit errors
    const isQuotaError = /429|quota.*exceeded|RESOURCE_EXHAUSTED|rate.?limit/i.test(rawMessage);
    const message = isQuotaError
      ? '⚠️ Quota exceeded (Error 429). The AI provider\'s rate limit was reached. Please wait a moment and try again.'
      : rawMessage;
    
    yield { type: 'error', error: message };
  }
}
