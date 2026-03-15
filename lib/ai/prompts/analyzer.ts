import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';

export function createAnalyzerPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsAnalyzerSkill(language);
  
  // Use different variable names to avoid conflict with JSON braces
  const template = new PromptTemplate({
    template: `
${skill}

Current year for calculations: 2026
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

JOB DESCRIPTION:
{{jobDesc}}

RESUME DATA (JSON):
{{resumeJson}}

{{formatInstr}}
  `,
    inputVariables: ['jobDesc', 'resumeJson', 'formatInstr'],
  });
  
  return template;
}
