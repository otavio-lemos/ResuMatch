/**
 * ATS ENGINE - Precision Logic
 * 
 * Combines AI qualitative analysis with strict functional metrics.
 */

import { ResumeData } from '@/store/useResumeStore';

// ─── Regex for Validation ───────────────────────────────────────────────────

const DATE_FORMAT_RE = /^(0[1-9]|1[0-2])\/\d{4}$|^(Atual|Presente|Present)$/i;

function countWords(text: string): number {
    return (text || '').split(/\s+/).filter(w => w.length > 2).length;
}

function checkDateFormat(date: string): boolean {
    return DATE_FORMAT_RE.test(date?.trim());
}

// ─── Main Score Logic ─────────────────────────────────────────────────────

export function getScore(data: ResumeData): number {
    const analysis = data.aiAnalysis;
    
    // 1. Mandatory Section Check
    const mandatory = ['personalInfo', 'summary', 'experiences', 'education', 'skills'];
    let missingCount = 0;
    if (!data.personalInfo?.fullName || !data.personalInfo?.email) missingCount++;
    if (!data.summary || data.summary.length < 30) missingCount++;
    if (!data.experiences || data.experiences.length === 0) missingCount++;
    if (!data.education || data.education.length === 0) missingCount++;
    if (!data.skills || data.skills.length === 0) missingCount++;

    const sectionScore = Math.max(0, 100 - (missingCount * 25));

    // 2. Date Format Check
    let dateChecks = 0;
    let datePasses = 0;
    [...(data.experiences || []), ...(data.education || [])].forEach(item => {
        if (item.startDate) { dateChecks++; if (checkDateFormat(item.startDate)) datePasses++; }
        if (item.endDate && !item.current) { dateChecks++; if (checkDateFormat(item.endDate)) datePasses++; }
    });
    const dateScore = dateChecks > 0 ? (datePasses / dateChecks) * 100 : 100;

    const functionalBase = (sectionScore * 0.6) + (dateScore * 0.4);

    // 3. Final Integration
    if (!analysis) return Math.round(functionalBase);

    const aiOverall = analysis.score ?? Math.round(((analysis.scores?.design || 0) + (analysis.scores?.estrutura || 0) + (analysis.scores?.conteudo || 0)) / 3);

    // Capped by functional reality
    const final = Math.max(0, Math.min(100, Math.round((aiOverall * 0.7) + (functionalBase * 0.3))));

    if (missingCount > 0 && final > 80) return 80;

    return final;
}

export function calculateJDMatch(resume: ResumeData, jobDescription: string): { 
    matchScore: number; 
    matchedKeywords: string[];
    missingKeywords: string[];
} {
    if (!jobDescription?.trim()) return { matchScore: 0, matchedKeywords: [], missingKeywords: [] };
    const resumeText = [
        resume?.summary || '',
        ...(resume?.experiences || []).map(e => e?.description || ''),
        ...(resume?.skills || []).flatMap(g => g?.skills || []),
        resume?.personalInfo?.title || ''
    ].join(' ').toLowerCase();
    
    const jdWords = jobDescription.toLowerCase().split(/[\s,\.\n\r\t\-•*+()\[\]{}&/]+/).filter(w => w.length > 3);
    const uniqueJDWords = Array.from(new Set(jdWords));
    const matched: string[] = [];
    const missing: string[] = [];
    uniqueJDWords.forEach(word => {
        if (resumeText.includes(word)) matched.push(word);
        else missing.push(word);
    });
    return { matchScore: uniqueJDWords.length > 0 ? Math.round((matched.length / uniqueJDWords.length) * 100) : 0, matchedKeywords: matched, missingKeywords: missing };
}
