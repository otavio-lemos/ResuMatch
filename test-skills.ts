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

// Test Parser Skill
const parserPt = getAtsParserSkill('pt');
const parserEn = getAtsParserSkill('en');

// Test Analyzer Skill
const analyzerPt = getAtsAnalyzerSkill('pt');

// Test Editor Skill
const editorPt = getAtsSummarySkill('pt');

// Test Audit Skill
const auditPt = getAtsAuditSkill('pt');

// Test Job Comparison Skill
const comparisonPt = getJobComparisonSkill('pt');

// Test UI Skill
const uiPt = getAtsUISkill('pt');

console.log('All skills loaded successfully');
