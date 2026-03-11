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

  console.log(`\n[DEBUG] Reading file: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log(`[DEBUG] File does not exist!`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function extractSection(content: string, startMarker: string, endMarker: string): string {
  console.log(`[DEBUG] Looking for start marker: "${startMarker}"`);
  const startIndex = content.indexOf(startMarker);
  console.log(`[DEBUG] Start index: ${startIndex}`);

  console.log(`[DEBUG] Looking for end marker: "${endMarker}"`);
  const endIndex = content.indexOf(endMarker);
  console.log(`[DEBUG] End index: ${endIndex}`);

  if (startIndex === -1 || endIndex === -1) {
    return '';
  }

  const extracted = content.substring(startIndex + startMarker.length, endIndex).trim();
  console.log(`[DEBUG] Extracted length: ${extracted.length}`);
  return extracted;
}

console.log('=== DEBUGGING SKILL EXTRACTION ===');

// Debug job-comparison
console.log('\n--- Job Comparison Skill ---');
const jobContent = readSkillFile('job-comparison', 'pt');
console.log(`File length: ${jobContent.length}`);
console.log('File content (first 500 chars):');
console.log(jobContent.substring(0, 500));

// Show markers found in file
const markers = jobContent.match(/########## [A-ZÇÃ]+/g);
console.log('\nMarkers found in file (regex):', markers);

// Also find all lines starting with ##########
const allMarkers = jobContent.split('\n').filter(line => line.startsWith('##########'));
console.log('All lines starting with ##########:', allMarkers);

// Debug resume-editor UI skill
console.log('\n--- Resume Editor UI Skill ---');
const editorContent = readSkillFile('resume-editor', 'pt');
const uiSection = extractSection(editorContent, '########## UUUIII', '########## FIM UUUIII');
console.log(`UI Section length: ${uiSection.length}`);
if (uiSection.length > 0) {
  console.log('UI Section content:');
  console.log(uiSection);
}
