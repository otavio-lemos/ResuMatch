import { getAtsAnalyzerSkill } from '@/lib/get-skill';

export function createAnalyzerPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsAnalyzerSkill(language);
  
  // Return a function that creates the prompt directly, avoiding template issues
  return {
    format: async function(args: { resumeJson: string; jobDesc: string; formatInstr: string }) {
      const jobDesc = args.jobDesc || 'N/A';
      const formatInstr = args.formatInstr;
      
      return `\
${skill}

Current year for calculations: 2026
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

JOB DESCRIPTION:
${jobDesc}

RESUME DATA (JSON):
${args.resumeJson}

${formatInstr}`;
    }
  };
}
