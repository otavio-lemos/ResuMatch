import fs from 'fs';
import path from 'path';

const DEFAULT_LANGUAGE = 'pt';

function getSkillPath(skillName: string, language: string = DEFAULT_LANGUAGE): string {
  const langSuffix = language === 'en' ? '.en' : '';
  return path.join(process.cwd(), '.agent', 'skills', skillName, `SKILL${langSuffix}.md`);
}

function getSkillContent(skillName: string, language: string = DEFAULT_LANGUAGE): string {
  try {
    const skillPath = getSkillPath(skillName, language);
    if (!fs.existsSync(skillPath)) {
      console.warn(`[Skill] ${skillPath} não encontrado, tentando PT...`);
      if (language !== DEFAULT_LANGUAGE) {
        const fallbackPath = getSkillPath(skillName, DEFAULT_LANGUAGE);
        if (fs.existsSync(fallbackPath)) {
          return fs.readFileSync(fallbackPath, 'utf-8');
        }
      }
      return "";
    }
    return fs.readFileSync(skillPath, 'utf-8');
  } catch (error) {
    console.error(`Erro ao ler o SKILL.md (${skillName}):`, error);
    return "";
  }
}

function extractFase(content: string, startMarker: string, endMarker: string): string {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);

  if (start === -1 || end === -1) {
    return "";
  }

  return content.substring(start + startMarker.length, end).trim();
}

export function getAtsParserSkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('ats-analyzer', language);
  const fase = extractFase(content, '########## PPPAAARRRSSSIIINNNGGG', '########## FIM PPPAAARRRSSSIIINNNGGG');

  if (!fase) {
    console.warn(`[Skill] ats-analyzer: Fase PPPAAARRRSSSIIINNNGGG não encontrada para idioma ${language}`);
    return language === 'en' 
      ? "You are a resume data extractor." 
      : "Você é um extrator de dados de currículos.";
  }

  const instructions = language === 'en'
    ? `STRICT: Return ONLY valid JSON, with no additional text.
MANDATORY JSON FORMAT:
{
  "_sectionHeaders": {
    "personalInfo": "<exact header title for personal/contact info in PDF>",
    "summary": "<exact header title for summary/profile/objective in PDF>",
    "experiences": "<exact header title for work experience in PDF>",
    "education": "<exact header title for education in PDF>",
    "skills": "<exact header title for skills/competencies in PDF>",
    "projects": "<exact header title for projects in PDF, or empty if none>",
    "certifications": "<exact header title for certifications in PDF, or empty if none>",
    "languages": "<exact header title for languages in PDF, or empty if none>",
    "volunteer": "<exact header title for volunteering in PDF, or empty if none>"
  },
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": [""] } ],
  "projects": [ { "id": "proj-1", "title": "", "subtitle": "", "description": "", "startDate": "", "endDate": "", "current": false } ]
}`
    : `STRICTO: Retorne APENAS JSON válido, sem texto adicional.
FORMATO JSON OBRIGATÓRIO:
{
  "_sectionHeaders": {
    "personalInfo": "<título exato do cabeçalho de informações pessoais/contato no PDF>",
    "summary": "<título exato do cabeçalho de resumo/perfil/objetivo no PDF>",
    "experiences": "<título exato do cabeçalho de experiência profissional no PDF>",
    "education": "<título exato do cabeçalho de formação/educação no PDF>",
    "skills": "<título exato do cabeçalho de habilidades/competências no PDF>",
    "projects": "<título exato do cabeçalho de projetos no PDF, ou vazio se não houver>",
    "certifications": "<título exato do cabeçalho de certificações no PDF, ou vazio se não houver>",
    "languages": "<título exato do cabeçalho de idiomas no PDF, ou vazio se não houver>",
    "volunteer": "<título exato do cabeçalho de voluntariado no PDF, ou vazio se não houver>"
  },
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": [""] } ],
  "projects": [ { "id": "proj-1", "title": "", "subtitle": "", "description": "", "startDate": "", "endDate": "", "current": false } ]
}`;

  return `${fase}\n\n${instructions}`;
}


export function getAtsAnalyzerSkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('ats-analyzer', language);
  const fase = extractFase(content, '########## AAAUUUDDDIIITTTOOORRRIIIAAA', '########## FIM AAAUUUDDDIIITTTOOORRRIIIAAA');

  if (!fase) {
    console.warn(`[Skill] ats-analyzer: Fase AAAUUUDDDIIITTTOOORRRIIIAAA não encontrada para idioma ${language}`);
    return language === 'en'
      ? "You are an ATS specialist."
      : "Você é um especialista em ATS.";
  }

  const instructions = language === 'en'
    ? `STRICT: Return ONLY valid JSON, with no additional text.
IMPORTANT: ALL text values in the JSON (feedback, suggestions, reasons, etc.) MUST be written in ENGLISH.
MANDATORY JSON FORMAT:
{
  "scores": { "design": 0, "structure": 0, "content": 0 },
  "designChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "structureChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "contentMetrics": {
    "wordCount": { "value": 0, "target": "330-573", "status": "good|warning|danger" },
    "paragraphsPerSection": { "value": 0, "target": "3-5", "status": "good|warning|danger" },
    "charsPerParagraph": { "value": 0, "target": "67-94", "status": "good|warning|danger" },
    "experienceDescriptions": { "value": 0, "target": "4-7", "status": "good|warning|danger" },
    "starBullets": { "value": 0, "target": ">70%", "status": "good|warning|danger" },
    "keywordCount": { "value": 0, "target": "15-25", "status": "good|warning|danger" },
    "pageCount": { "value": 0, "target": "1-2", "status": "good|warning|danger" }
  },
  "improvedBullets": [ { "section": "experience", "index": 0, "original": "string", "improved": "string", "reason": "string" } ],
  "detailedSuggestions": [ { "type": "string", "field": "string", "original": "string", "issue": "string", "suggestion": "string", "impact": "high|medium|low" } ]
}`
    : `STRICTO: Retorne APENAS JSON válido, sem texto adicional.
IMPORTANTE: TODOS os valores de texto no JSON (feedback, sugestões, motivos, etc.) DEVEM ser escritos em PORTUGUÊS.
FORMATO JSON OBRIGATÓRIO:
{
  "scores": { "design": 0, "estrutura": 0, "conteudo": 0 },
  "designChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "estruturaChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "conteudoMetrics": {
    "wordCount": { "value": 0, "target": "330-573", "status": "good|warning|danger" },
    "paragraphsPerSection": { "value": 0, "target": "3-5", "status": "good|warning|danger" },
    "charsPerParagraph": { "value": 0, "target": "67-94", "status": "good|warning|danger" },
    "experienceDescriptions": { "value": 0, "target": "4-7", "status": "good|warning|danger" },
    "starBullets": { "value": 0, "target": ">70%", "status": "good|warning|danger" },
    "keywordCount": { "value": 0, "target": "15-25", "status": "good|warning|danger" },
    "pageCount": { "value": 0, "target": "1-2", "status": "good|warning|danger" }
  },
  "improvedBullets": [ { "section": "experience", "index": 0, "original": "string", "improved": "string", "reason": "string" } ],
  "detailedSuggestions": [ { "type": "string", "field": "string", "original": "string", "issue": "string", "suggestion": "string", "impact": "high|medium|low" } ]
}`;

  return `${fase}\n\n${instructions}`;
}

export function getAtsSummarySkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('ats-analyzer', language);
  const fase = extractFase(content, '########## EEEDDDIIITTTOOORRR', '########## FIM EEEDDDIIITTTOOORRR');

  if (!fase) {
    console.warn(`[Skill] getAtsSummarySkill: Fase SSSUMMMMAAARRRYYY não encontrada para idioma ${language}`);
    return language === 'en'
      ? "You are a professional writing specialist."
      : "Você é um especialista em redação profissional.";
  }

  return fase;
}

export function getAtsUISkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('ats-analyzer', language);
  const fase = extractFase(content, '########## UUUIII', '########## FIM UUUIII');

  if (!fase) {
    console.warn(`[Skill] getAtsUISkill: Fase UUUIII não encontrada para idioma ${language}`);
    return language === 'en'
      ? "UI Integration (Zustand) - Keep TypeScript types aligned with the JSON format defined in this skill."
      : "Integração com UI (Zustand) - Mantenha os tipos TypeScript alinhados com o formato JSON definido nesta skill.";
  }

  return fase;
}

export function getResumeEditorSummarySkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('resume-editor', language);
  const fase = extractFase(content, '########## SSSUMMMMAAARRRYYY', '########## FIM SSSUMMMMAAARRRYYY');

  if (!fase) {
    console.warn(`[Skill] getResumeEditorSummarySkill: Fase SSSUMMMMAAARRRYYY não encontrada para idioma ${language}`);
    return language === 'en'
      ? "You are an elite resume writer, specialized in ATS."
      : "Você é um redator de currículos de elite, especializado em ATS.";
  }

  return fase;
}

export function getResumeEditorRewriteSkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('resume-editor', language);
  const fase = extractFase(content, '########## SSSTTTAAARRRREEEwwwrrriiittteee', '########## FIM SSSTTTAAARRRREEEUWWWRRRIIITTTEEE');

  if (!fase) {
    console.warn(`[Skill] getResumeEditorRewriteSkill: Fase SSSTTTAAARRRREEEwwwrrriiittteee não encontrada para idioma ${language}`);
    return language === 'en'
      ? "You are a career and ATS specialist."
      : "Você é um especialista em carreira e ATS.";
  }

  return fase;
}

export function getResumeEditorGrammarSkill(language: string = DEFAULT_LANGUAGE): string {
  const content = getSkillContent('resume-editor', language);
  const fase = extractFase(content, '########## GGGRRRAAAMMMMMMAAARRRR', '########## FIM GGGRRRAAAMMMMMMAAARRRR');

  if (!fase) {
    console.warn(`[Skill] getResumeEditorGrammarSkill: Fase GGGRRRAAAMMMMMMAAARRRR não encontrada para idioma ${language}`);
    return language === 'en'
      ? "You are a surgical grammar corrector specialized in professional and technical texts."
      : "Você é um revisor gramatical cirúrgico especializado em textos profissionais e técnicos.";
  }

  return fase;
}
