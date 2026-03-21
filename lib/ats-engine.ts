/**
 * ATS ENGINE - Single Source of Truth
 * 
 * Only uses AI Analysis as source. No local fallback.
 */

import { ResumeData } from '@/store/useResumeStore';
import { SKILL_DICTIONARY } from './skill-dictionary';

// ─── Constants & Regex ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FORMAT_RE = /^(0[1-9]|1[0-2])\/\d{4}$|^\d{4}-\d{2}$|^[A-Z][a-z]+\s\d{4}$/i;
const METRIC_RE = /(\d+\s*(%|mil|k\b|m\b|milhões?|bilhões?|reais|usd|\$|€|funcionários?|projetos?|clientes?|usuários?|horas?|dias?|meses?|semanas?|sprint|vezes|vendas|conversão|pontos|recorrência|impacto|growth|crescimento|revenue|receita))/i;

// ─── Helpers ────────────────────────────────────────────────────────────────

function countWords(text: string): number {
    return (text || '').split(/\s+/).filter(w => w.length > 1).length;
}

function hasStandardBullets(text: string): boolean {
    if (!text) return false;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.some(l => /^[•\-\*]/.test(l.trim()));
}

function detectSTAR(text: string): boolean {
    const hasAction = /(liderou|gerenciou|desenvolveu|criou|aumentou|reduziu|facilitou|liderança|otimizou|led|managed|created|built|increased|reduced|optimized|achieved|conquistou|entregou|delivered|spearheaded|engineered|implemented|coordinated)/i.test(text);
    const hasResult = METRIC_RE.test(text) || /(resultou|gerando|impacto|entregando|economizou|resulting|achieving|delivery|impact|saved|revenue|receita|lucro|roi|performance)/i.test(text);
    return hasAction && hasResult;
}

const STOP_WORDS = new Set([
    'a', 'o', 'de', 'da', 'do', 'em', 'para', 'com', 'que', 'e', 'é',
    'the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by'
]);

function extractKeywords(text: string): string[] {
    const lowerText = (text || '').toLowerCase();
    const words = lowerText.split(/[\s,\.\n\r\t\-•*+()\[\]{}&/]+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
    
    // Add multi-word skills from dictionary if they appear in text
    const multiWordSkills = Object.keys(SKILL_DICTIONARY).filter(k => k.includes(' '));
    for (const skill of multiWordSkills) {
        if (lowerText.includes(skill.toLowerCase())) {
            words.push(skill);
        }
    }
    
    return Array.from(new Set(words));
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

export function calculateJDMatch(resume: ResumeData, jobDescription: string): { 
    matchScore: number; 
    matchedKeywords: string[];
    missingKeywords: string[];
    jdKeywords: string[];
} {
    const jdString = typeof jobDescription === 'string' ? jobDescription : '';
    if (!jdString.trim()) return { matchScore: 0, matchedKeywords: [], missingKeywords: [], jdKeywords: [] };
    const jdKeywordsRaw = extractKeywords(jdString);
    // Prefer longer keywords (phrases) over parts of them
    const jdKeywords = jdKeywordsRaw.filter(k1 => !jdKeywordsRaw.some(k2 => k2 !== k1 && k2.includes(k1)));

    const resumeText = [
        resume?.summary || '',
        ...(resume?.experiences || []).map(e => e?.description || ''),
        ...(resume?.skills || []).flatMap(g => g?.skills || []),
        resume?.personalInfo?.title || ''
    ].join(' ').toLowerCase();
    
    const resumeKeywords = extractKeywords(resumeText);
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];
    
    for (const keyword of jdKeywords) {
        if (resumeKeywords.some(rk => rk === keyword || rk.includes(keyword) || keyword.includes(rk) || (rk.length > 3 && keyword.length > 3 && levenshteinDistance(rk, keyword) <= 1))) {
            matchedKeywords.push(keyword);
        } else {
            missingKeywords.push(keyword);
        }
    }
    return { matchScore: jdKeywords.length > 0 ? Math.min(100, Math.round((matchedKeywords.length / jdKeywords.length) * 100)) : 0, matchedKeywords, missingKeywords, jdKeywords };
}

// ─── Main Score Function ───────────────────────────────────────────────────

export function getScore(data: ResumeData): number {
    const analysis = data.aiAnalysis;
    
    // Priority 1: AI Result
    if (analysis?.score !== undefined && analysis.score > 0) {
        return analysis.score;
    }
    
    if (analysis?.scores?.design !== undefined) {
        const str = analysis.scores.estrutura || analysis.scores.structure || 0;
        const cont = analysis.scores.conteudo || analysis.scores.content || 0;
        return Math.round((analysis.scores.design + str + cont) / 3);
    }
    
    // Priority 2: Local Baseline Fallback
    return calculateLocalBaseline(data);
}

function calculateLocalBaseline(data: ResumeData): number {
    let score = 0;
    
    // 1. Basic Info (up to 20 pts)
    if (data.personalInfo.fullName) score += 5;
    if (data.personalInfo.email && EMAIL_RE.test(data.personalInfo.email)) score += 5;
    if (data.personalInfo.phone) score += 5;
    if (data.personalInfo.linkedin || data.personalInfo.portfolio) score += 5;
    
    // 2. Volume & Structure (up to 30 pts)
    const wordCount = countWords([
        data.summary,
        ...(data.experiences || []).map(e => e.description),
        ...(data.education || []).map(e => e.description)
    ].join(' '));
    
    if (wordCount >= 200 && wordCount <= 600) score += 20;
    else if (wordCount > 50) score += 10;
    
    if ((data.experiences || []).length > 0) score += 5;
    if ((data.education || []).length > 0) score += 5;
    
    // 3. Quality Metrics (up to 50 pts)
    const allDescriptions = [
        data.summary,
        ...(data.experiences || []).map(e => e.description)
    ].join('\n');
    
    // STAR Detection
    const bulletLines = allDescriptions.split('\n').filter(l => l.trim().length > 10);
    const starCount = bulletLines.filter(detectSTAR).length;
    if (starCount >= 3) score += 20;
    else if (starCount >= 1) score += 10;
    
    // Skill usage
    const skillsCount = (data.skills || []).reduce((acc, g) => acc + (g.skills || []).length, 0);
    if (skillsCount >= 8) score += 15;
    else if (skillsCount >= 3) score += 5;
    
    // Certifications (check expiration)
    if (data.certifications && data.certifications.length > 0) {
        const now = new Date();
        const validCerts = data.certifications.filter(c => {
            if (!c.expirationDate) return true;
            try {
                const exp = new Date(c.expirationDate);
                return exp > now;
            } catch {
                return true;
            }
        });
        if (validCerts.length > 0) score += 10;
        if (validCerts.length < data.certifications.length) score -= 5; // Penalty for expired certs
    }

    // Standard formats
    if (hasStandardBullets(allDescriptions)) score += 5;
    
    return Math.max(0, Math.min(100, score));
}
