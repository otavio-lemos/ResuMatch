import { getChatModel } from '../client';
import { ResumeDataSchema } from '../types';
import { AISettings } from '@/store/useAISettingsStore';

export interface ParseResumeInput {
  resumeContent: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

function tryParseJSON(text: string): any | null {
  // Multiple cleanup strategies
  const strategies = [
    // 1. Remove markdown fences
    () => text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim(),
    // 2. Remove any leading/trailing non-JSON
    () => {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return text.substring(start, end + 1);
      }
      return text;
    },
    // 3. Remove escaped quotes issues
    () => text.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
    // 4. Fix unclosed strings - last resort
    () => {
      let depth = 0;
      let inString = false;
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && text[i-1] !== '\\') {
          inString = !inString;
        }
        if (!inString) {
          if (char === '{' || char === '[') depth++;
          if (char === '}' || char === ']') depth--;
        }
        result += char;
        if (depth < 0) break;
      }
      return result;
    }
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

export async function* parseResumeChain(input: ParseResumeInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeContent, language, aiSettings } = input;
  const safeAiSettings = aiSettings || {};
  
  try {
    console.log('[parseResumeChain] Getting chat model...');
    const model = getChatModel(safeAiSettings);
    console.log('[parseResumeChain] Model obtained, creating prompt...');
    
    const skill = require('@/lib/get-skill').getAtsParserSkill(language);
    const languageNote = language === 'pt' ? 'Portuguese (Brazilian)' : 'English';
    
    const prompt = `
${skill}

IMPORTANT: Use exact section names from document in _sectionHeaders.
Language: ${languageNote}

Now parse this resume content:

${resumeContent}

Respond with valid JSON only. No markdown fences.
`;
    
    console.log('[parseResumeChain] Starting invoke, prompt length:', prompt.length);
    
    const invokeResponse = await model.invoke([
      { role: 'user', content: prompt }
    ]);
    
    let fullContent = typeof invokeResponse.content === 'string' 
      ? invokeResponse.content 
      : JSON.stringify(invokeResponse.content);
    
    yield { type: 'chunk', content: fullContent };
    
    console.log('[parseResumeChain] Response length:', fullContent.length);
    
    // Try multiple parsing strategies
    let parsed = tryParseJSON(fullContent);
    
    if (parsed) {
      try {
        const validated = ResumeDataSchema.parse(parsed);
        console.log('[parseResumeChain] Parsing complete, keys:', Object.keys(validated));
        
        if (validated.summary && typeof validated.summary === 'string') {
          let summary = validated.summary;
          summary = summary.replace(/\.\s*,/g, '.');
          summary = summary.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');
          if (!summary.includes('\n')) {
            summary = summary.replace(/\. ([A-ZÀ-Ú])/g, '.\n\n$1').replace(/;\s*([A-ZÀ-Ú])/g, ';\n\n$1');
          }
          summary = summary.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
          validated.summary = summary;
        }

        ['experiences', 'education', 'projects'].forEach((section: string) => {
          if (Array.isArray((validated as any)[section])) {
            (validated as any)[section].forEach((item: any) => {
              if (Array.isArray(item.description)) {
                const fixedBullets = item.description.map((d: string) => {
                  let fixed = d.replace(/\.\s*,/g, '.');
                  fixed = fixed.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');
                  return fixed.startsWith('-') || fixed.startsWith('•') ? fixed : `- ${fixed}`;
                });
                item.description = fixedBullets.join('\n');
              } else if (typeof item.description === 'string') {
                let desc = item.description;
                desc = desc.replace(/\.\s*,/g, '.');
                desc = desc.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');
                if (!desc.includes('\n')) {
                  desc = desc.replace(/\. ([a-zA-ZÀ-ú])/g, '.\n- $1').replace(/; ([a-zA-ZÀ-ú])/g, ';\n- $1').replace(/\.\s*$/, '.');
                }
                item.description = desc;
              }
            });
          }
        });
        
        yield { type: 'done', data: validated };
        return;
      } catch (e) {
        console.warn('[parseResumeChain] Schema validation failed:', e);
      }
    }
    
    // Last resort: try regex extraction
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = tryParseJSON(jsonMatch[0]);
      if (parsed) {
        const validated = ResumeDataSchema.parse(parsed);
        yield { type: 'done', data: validated };
        return;
      }
    }
    
    throw new Error('Failed to parse JSON from model response');
    
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parseResumeChain] Error:', rawMessage);
    
    const isQuotaError = /429|quota.*exceeded|RESOURCE_EXHAUSTED|rate.?limit/i.test(rawMessage);
    const message = isQuotaError
      ? '⚠️ Quota exceeded (Error 429). The AI provider\'s rate limit was reached. Please wait a moment and try again.'
      : rawMessage;
    
    yield { type: 'error', error: message };
  }
}
