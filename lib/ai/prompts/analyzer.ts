import { getAtsAnalyzerSkill } from '@/lib/get-skill';

export function createAnalyzerPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsAnalyzerSkill(language);
  
  return {
    format: async function(args: { resumeJson: string; jobDesc: string; formatInstr: string }) {
      const jobDesc = args.jobDesc || 'N/A';
      const formatInstr = args.formatInstr;
      
      return `\
${skill}

CRITICAL: Você está analisando um CURRÍCULO (dados em formato JSON). Os dados do currículo incluem: informações pessoais, experiência profissional, formação acadêmica, habilidades, certificações, etc.
NÃO diga "Não aplicável para análise de dados JSON" - analise os dados DO CURRÍCULO como se fosse um documento real.
Para cada item verificado, forneça feedback específico baseado nos dados reais do currículo, não em suposições.

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
