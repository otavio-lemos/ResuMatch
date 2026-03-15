import { getAtsParserSkill } from '@/lib/get-skill';

export function createParserPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsParserSkill(language);
  
  const template = `
${skill}

IMPORTANT: You MUST use the exact section names from the document in _sectionHeaders.
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

Now parse this resume content:

RESUME_CONTENT_PLACEHOLDER

FORMAT_INSTRUCTIONS_PLACEHOLDER
`;
  
  return {
    template,
    format: async ({ resumeContent, formatInstructions }: { resumeContent: string; formatInstructions: string }) => {
      return template
        .replace('RESUME_CONTENT_PLACEHOLDER', resumeContent)
        .replace('FORMAT_INSTRUCTIONS_PLACEHOLDER', formatInstructions);
    }
  };
}
