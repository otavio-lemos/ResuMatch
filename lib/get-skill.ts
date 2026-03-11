/**
 * ATS Skills Loader
 *
 * Loads and extracts skill prompts from .agent/skills/ directory
 * Supports PT and EN languages
 */

import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(process.cwd(), '.agent', 'skills');

/**
 * Reads SKILL.md file for a given skill and language
 */
function readSkillFile(skillName: string, language: string = 'pt'): string {
  const filePath = path.join(
    SKILLS_DIR,
    skillName,
    `SKILL${language === 'en' ? '.en' : ''}.md`
  );

  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[Skill] ${filePath} not found, trying PT...`);
      // Fallback to PT if EN doesn't exist
      if (language !== 'pt') {
        const ptPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
        if (fs.existsSync(ptPath)) {
          return fs.readFileSync(ptPath, 'utf-8');
        }
      }
      return '';
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading SKILL.md (${skillName}):`, error);
    return '';
  }
}

/**
 * Extracts section between markers from skill content
 */
function extractSection(content: string, startMarker: string, endMarker: string): string {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return '';
  }

  return content.substring(startIndex + startMarker.length, endIndex).trim();
}

/**
 * Get ATS Parser Skill (Phase 1 - Import/Parsing)
 * Extracts from PPPAAARRRSSSIIINNNGGG section
 */
export function getAtsParserSkill(language: string = 'pt'): string {
  const content = readSkillFile('ats-parser', language);
  const section = extractSection(content, '########## PPPAAARRRSSSIIINNNGGG', '########## FIM PPPAAARRRSSSIIINNNGGG');

  if (!section) {
    console.warn(`[Skill] ats-parser: PPPAAARRRSSSIIINNNGGG section not found for language ${language}`);
    return language === 'en'
      ? 'You are a resume data extractor.'
      : 'Você é um extrator de dados de currículos.';
  }

  return section;
}

/**
 * Get ATS Analyzer Skill (Phase 2 - Audit/ATS)
 * Extracts from AAAUUUDDDIIITTTOOORRRIIIAAA section
 */
export function getAtsAnalyzerSkill(language: string = 'pt'): string {
  const content = readSkillFile('ats-auditor', language);
  const section = extractSection(content, '########## AAAUUUDDDIIITTTOOORRRIIIAAA', '########## FIM AAAUUUDDDIIITTTOOORRRIIIAAA');

  if (!section) {
    console.warn(`[Skill] ats-auditor: AAAUUUDDDIIITTTOOORRRIIIAAA section not found for language ${language}`);
    return language === 'en'
      ? 'You are an ATS specialist.'
      : 'Você é um especialista em ATS.';
  }

  return section;
}

/**
 * Get ATS Summary Skill (for summary generation)
 * Extracts from SSSUMMMMAAARRRYYY section
 */
export function getAtsSummarySkill(language: string = 'pt'): string {
  const content = readSkillFile('resume-editor', language);
  const section = extractSection(content, '########## SSSUMMMMAAARRRYYY', '########## FIM SSSUMMMMAAARRRYYY');

  if (!section) {
    console.warn(`[Skill] resume-editor: SSSUMMMMAAARRRYYY section not found for language ${language}`);
    return language === 'en'
      ? 'You are a professional resume writer.'
      : 'Você é um redator profissional de currículos.';
  }

  return section;
}

/**
 * Get ATS Rewrite Skill (for STAR reformulation)
 * Extracts from SSSTTTAAARRRREEEwwwrrriiittteee section
 */
export function getAtsRewriteSkill(language: string = 'pt'): string {
  const content = readSkillFile('resume-editor', language);
  const section = extractSection(content, '########## SSSTTTAAARRRREEEwwwrrriiittteee', '########## FIM SSSTTTAAARRRREEEUWWWRRRIIITTTEEE');

  if (!section) {
    console.warn(`[Skill] resume-editor: SSSTTTAAARRRREEEwwwrrriiittteee section not found for language ${language}`);
    return language === 'en'
      ? 'You are an ATS specialist for resume bullets.'
      : 'Você é um especialista em bullets ATS.';
  }

  return section;
}

/**
 * Get ATS Grammar Skill (for grammar correction)
 * Extracts from GGGRRRAAAMMMMMMAAARRRR section
 */
export function getAtsGrammarSkill(language: string = 'pt'): string {
  const content = readSkillFile('resume-editor', language);
  const section = extractSection(content, '########## GGGRRRAAAMMMMMMAAARRRR', '########## FIM GGGRRRAAAMMMMMMAAARRRR');

  if (!section) {
    console.warn(`[Skill] resume-editor: GGGRRRAAAMMMMMMAAARRRR section not found for language ${language}`);
    return language === 'en'
      ? 'You are a grammar correction specialist.'
      : 'Você é um especialista em correção gramatical.';
  }

  return section;
}

/**
 * Get ATS Audit Skill (for audit button)
 * Extracts from AAAUUUDDDIIITTTAAATTTSSS section in resume-editor
 */
export function getAtsAuditSkill(language: string = 'pt'): string {
  const content = readSkillFile('resume-editor', language);
  const section = extractSection(content, '########## AAAUUUDDDIIITTTAAATTTSSS', '########## FIM AAAUUUDDDIIITTTAAATTTSSS');

  if (!section) {
    console.warn(`[Skill] resume-editor: AAAUUUDDDIIITTTAAATTTSSS section not found for language ${language}`);
    return language === 'en'
      ? 'You are an ATS analysis specialist.'
      : 'Você é um especialista em análise ATS.';
  }

  return section;
}

/**
 * Get Job Comparison Skill
 * Extracts from CCOOMMPPAARRAAÇÃÃOO section
 */
export function getJobComparisonSkill(language: string = 'pt'): string {
  const content = readSkillFile('job-comparison', language);
  const section = extractSection(content, '########## CCOOMMPPAARRAAÇÃÃOO', '########## FIM CCOOMMPAAARRAAÇÃÃOO');

  if (!section) {
    console.warn(`[Skill] job-comparison: CCOOMMPPAARRAAÇÃÃOO section not found for language ${language}`);
    return language === 'en'
      ? 'You are a job matching specialist.'
      : 'Você é um especialista em matching de vagas.';
  }

  return section;
}

/**
 * Get ATS UI Skill (for UI integration)
 * Extracts from UUUIII section in resume-editor
 */
export function getAtsUISkill(language: string = 'pt'): string {
  const content = readSkillFile('resume-editor', language);
  const section = extractSection(content, '########## UUUIII', '########## FIM UUUIII');

  if (!section) {
    console.warn(`[Skill] resume-editor: UUUIII section not found for language ${language}`);
    return language === 'en'
      ? 'UI integration guidelines for resume analysis.'
      : 'Diretrizes de integração UI para análise de currículo.';
  }

  return section;
}

// Re-export for backward compatibility
export { getAtsParserSkill as getParserSkillContent };
export { getAtsAnalyzerSkill as getSkillContent };
export { getAtsSummarySkill as getResumeEditorSummaryContent };
