/**
 * Test script to verify skill loading
 */

import { 
  getAtsParserSkill, 
  getAtsAnalyzerSkill, 
  getAtsSummarySkill, 
  getAtsAuditSkill,
  getJobComparisonSkill,
  getAtsUISkill
} from './lib/get-skill';

console.log('=== Testing Skill Loading ===\n');

// Test 1: Parser Skill
console.log('1. Testing getAtsParserSkill("pt")...');
const parserPt = getAtsParserSkill('pt');
console.log(`   Length: ${parserPt.length}`);
console.log(`   Contains "PPPAAARRRSSSIIINNNGGG": ${parserPt.includes('PPPAAARRRSSSIIINNNGGG')}`);
console.log(`   Contains "System Prompt": ${parserPt.includes('System Prompt')}\n`);

// Test 2: Analyzer Skill
console.log('2. Testing getAtsAnalyzerSkill("pt")...');
const analyzerPt = getAtsAnalyzerSkill('pt');
console.log(`   Length: ${analyzerPt.length}`);
console.log(`   Contains "AAAUUUDDDIIITTTOOORRRIIIAAA": ${analyzerPt.includes('AAAUUUDDDIIITTTOOORRRIIIAAA')}`);
console.log(`   Contains "PILARES DE AVALIAÇÃO": ${analyzerPt.includes('PILARES DE AVALIAÇÃO')}\n`);

// Test 3: Editor Skill
console.log('3. Testing getAtsSummarySkill("pt")...');
const editorPt = getAtsSummarySkill('pt');
console.log(`   Length: ${editorPt.length}`);
console.log(`   Contains "Ações do Editor": ${editorPt.includes('Ações do Editor')}`);
console.log(`   Contains "Regras de Geração": ${editorPt.includes('Regras de Geração')}\n`);

// Test 4: Audit Skill
console.log('4. Testing getAtsAuditSkill("pt")...');
const auditPt = getAtsAuditSkill('pt');
console.log(`   Length: ${auditPt.length}`);
console.log(`   Contains "AUDITORIA ATS": ${auditPt.includes('AUDITORIA ATS')}\n`);

// Test 5: Job Comparison Skill
console.log('5. Testing getJobComparisonSkill("pt")...');
const comparisonPt = getJobComparisonSkill('pt');
console.log(`   Length: ${comparisonPt.length}`);
console.log(`   Contains "CCOOMMPPAARRAAÇÃÃOO": ${comparisonPt.includes('CCOOMMPPAARRAAÇÃÃOO')}`);
console.log(`   Contains "Comparação Currículo": ${comparisonPt.includes('Comparação Currículo')}\n`);

// Test 6: UI Skill
console.log('6. Testing getAtsUISkill("pt")...');
const uiPt = getAtsUISkill('pt');
console.log(`   Length: ${uiPt.length}`);
console.log(`   Contains "UUUIII": ${uiPt.includes('UUUIII')}\n`);

// Test 7: English versions
console.log('7. Testing English versions...');
const parserEn = getAtsParserSkill('en');
console.log(`   Parser EN Length: ${parserEn.length}`);
console.log(`   Contains "Import Phase": ${parserEn.includes('Import Phase')}\n`);

console.log('=== All Tests Complete ===');
