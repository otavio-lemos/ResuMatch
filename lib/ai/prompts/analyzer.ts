import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';

export function createAnalyzerPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsAnalyzerSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

Current year for calculations: 2026
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

{{jobDescription}}
RESUME DATA (JSON):
{resumeData}

{formatInstructions}
  `);
  
  return template;
}
