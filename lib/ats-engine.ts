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
const METRIC_RE = /(\d+\s*(%|mil|k\b|m\b|milhões?|bilhões?|reais|usd|\$|€|funcionários?|projetos?|clientes?|usuários?|horas?|dias?|meses?|semanas?|sprint|vezes|vendas|conversão|pontos|recorrência))/i;

// ─── Helpers ────────────────────────────────────────────────────────────────

function countWords(text: string): number {
    return (text || '').split(/\s+/).filter(w => w.length > 2).length;
}

function hasStandardBullets(text: string): boolean {
    if (!text) return false;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.some(l => /^[•\-\*]/.test(l.trim()));
}

function detectSTAR(text: string): boolean {
    const hasAction = /(liderou|gerenciou|desenvolveu|criou|aumentou|reduziu|facilitou|liderança|otimizou|led|managed|created|built|increased|reduced|optimized|achieved|conquistou|entregou|delivered)/i.test(text);
    const hasResult = METRIC_RE.test(text) || /(resultou|gerando|impacto|entregando|economizou|resulting|achieving|delivery|impact|saved|revenue|receita|lucro)/i.test(text);
    return hasAction && hasResult;
}

const STOP_WORDS = new Set([
    'a', 'o', 'de', 'da', 'do', 'em', 'para', 'com', 'que', 'e', 'é',
    'the', 'and', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by'
]);

function extractKeywords(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[\s,\.\n\r\t\-•*+()\[\]{}&/]+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
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
    if (!jobDescription?.trim()) return { matchScore: 0, matchedKeywords: [], missingKeywords: [], jdKeywords: [] };
    const jdKeywords = extractKeywords(jobDescription);
    const resumeText = [resume.summary, ...resume.experiences.map(e => e.description), ...resume.skills.flatMap(g => g.skills), resume.personalInfo.title].join(' ').toLowerCase();
    const resumeKeywords = extractKeywords(resumeText);
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];
    for (const keyword of jdKeywords) {
        if (resumeKeywords.some(rk => rk.includes(keyword) || keyword.includes(rk) || levenshteinDistance(rk, keyword) <= 2)) matchedKeywords.push(keyword);
        else missingKeywords.push(keyword);
    }
    return { matchScore: jdKeywords.length > 0 ? Math.min(100, Math.round((matchedKeywords.length / jdKeywords.length) * 100)) : 0, matchedKeywords, missingKeywords, jdKeywords };
}

// ─── Main Score Function - SINGLE SOURCE ────────────────────────────────────────

export function getScore(data: ResumeData): number {
    const analysis = data.aiAnalysis;
    
    if (analysis?.score !== undefined) {
        return analysis.score;
    }
    
    if (analysis?.scores?.design !== undefined) {
        return Math.round((analysis.scores.design + analysis.scores.estrutura + analysis.scores.conteudo) / 3);
    }
    
    return 0;
}
