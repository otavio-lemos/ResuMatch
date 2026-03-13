/**
 * Debug script to see exactly what's being extracted
 */

import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), '.agent', 'skills');

function readSkillFile(skillName: string, language: string = 'pt'): string {
  const filePath = path.join(
    SKILLS_DIR,
    skillName,
    `SKILL${language === 'en' ? '.en' : ''}.md`
  );

  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function extractSection(content: string, startMarker: string, endMarker: string): string {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return '';
  }

  return content.substring(startIndex + startMarker.length, endIndex).trim();
}

// Debug job-comparison
const jobContent = readSkillFile('job-comparison', 'pt');
console.log('Job comparison content length:', jobContent.length);

// Debug resume-editor UI skill
const editorContent = readSkillFile('resume-editor', 'pt');
const uiSection = extractSection(editorContent, '########## UUUIII', '########## FIM UUUIII');
console.log('UI Section extracted, length:', uiSection.length);
