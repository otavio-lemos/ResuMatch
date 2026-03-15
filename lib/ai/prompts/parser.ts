import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsParserSkill } from '@/lib/get-skill';

export function createParserPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsParserSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

IMPORTANT: You MUST use the exact section names from the document in _sectionHeaders.
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

Now parse this resume content:

{resumeContent}

{formatInstructions}
  `);
  
  return template;
}
