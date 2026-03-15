import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsRewriteSkill } from '@/lib/get-skill';

export function createRewritePrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsRewriteSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

Rewrite this content:

{bulletContent}

Output only the rewritten bullets, one per line.
  `);
  
  return template;
}
