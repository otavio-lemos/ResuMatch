export type SkillType = 'hard' | 'soft';

export interface ClassifiedSkill {
  id: string;
  category: string;
  skills: string[];
  type: SkillType;
}

const HARD_CATEGORIES = [
  'programming', 'programação', 'coding', 'development', 'desenvolvimento',
  'languages', 'idiomas', 'frameworks', 'libraries', 'bibliotecas',
  'tools', 'ferramentas', 'technologies', 'tecnologias', 'tech',
  'cloud', 'aws', 'azure', 'gcp', 'devops', 'ci/cd',
  'database', 'banco de dados', 'sql', 'nosql', 'mongodb', 'postgres',
  'frontend', 'backend', 'fullstack', 'mobile', 'ios', 'android',
  'machine learning', 'ml', 'ai', 'data science', 'data engineering',
  'security', 'cybersecurity', 'redes', 'networking', 'infrastructure',
  'agile', 'scrum', 'kanban', 'jira', 'project management',
  'design', 'ui', 'ux', 'figma', 'photoshop', 'graphic',
  'marketing', 'seo', 'analytics', 'salesforce', 'crm',
  'finance', 'accounting', 'erp', 'sap', 'excel', 'power bi',
  'hardware', 'electronics', 'iot', 'embedded', 'robotics'
];

const SOFT_CATEGORIES = [
  'soft skills', 'competências', 'comportamental', 'comportamentais',
  'leadership', 'liderança', 'teamwork', 'trabalho em equipe',
  'communication', 'comunicação', 'interpersonal', 'interpessoal',
  'problem solving', 'resolução de problemas', 'critical thinking', 'pensamento crítico',
  'creativity', 'criatividade', 'innovation', 'inovação',
  'adaptability', 'adaptabilidade', 'flexibility', 'flexibilidade',
  'time management', 'gestão de tempo', 'organization', 'organização',
  'collaboration', 'colaboração', 'negotiation', 'negociação',
  'empathy', 'empatia', 'emotional intelligence', 'inteligência emocional',
  'presentation', 'apresentação', 'public speaking', 'oratória',
  'conflict resolution', 'gestão de conflitos', 'mentoring', 'mentoria',
  'networking', 'relationship building', 'construção de relacionamentos',
  'customer service', 'atendimento ao cliente', 'stakeholder management',
  'strategic thinking', 'pensamento estratégico', 'decision making', 'tomada de decisão'
];

export function classifyCategory(category: string): SkillType {
  const lowerCategory = category.toLowerCase();
  
  for (const hardKeyword of HARD_CATEGORIES) {
    if (lowerCategory.includes(hardKeyword)) {
      return 'hard';
    }
  }
  
  for (const softKeyword of SOFT_CATEGORIES) {
    if (lowerCategory.includes(softKeyword)) {
      return 'soft';
    }
  }
  
  return 'hard';
}

export function classifySkills(skills: Array<{ id: string; category: string; skills: string[] }>): ClassifiedSkill[] {
  return skills.map(skill => ({
    ...skill,
    type: classifyCategory(skill.category)
  }));
}

export function separateByType(skills: ClassifiedSkill[]) {
  return {
    hard: skills.filter(s => s.type === 'hard'),
    soft: skills.filter(s => s.type === 'soft')
  };
}

export function formatSkillsForDisplay(skills: ClassifiedSkill[]): { hard: string[]; soft: string[] } {
  const separated = separateByType(skills);
  
  return {
    hard: separated.hard.flatMap(s => s.skills).filter(Boolean),
    soft: separated.soft.flatMap(s => s.skills).filter(Boolean)
  };
}
