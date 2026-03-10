'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { rateLimitById } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { saveResume, listResumes, deleteResumeLocal, loadResume } from '@/lib/storage/resume-storage';
import { getMockDataForTemplate } from '@/lib/mock-resume-data';
import { getTranslation } from '@/hooks/useTranslation';

const resumeActionLimit = {
    windowMs: 60 * 1000,
    maxRequests: 5
};

const DEFAULT_TEMPLATE_ID = 'classic';

export async function createNewResume(formData?: FormData, templateId?: string, includeSampleData: boolean = true, language: string = 'pt') {
    const localUserId = 'local-user';

    const rl = rateLimitById(localUserId, resumeActionLimit);
    if (!rl.allowed) {
		const message = getTranslation('templates.rateLimitError', language as any);
		return { error: 'rate_limit', message };
    }

    const isFromTemplate = !!templateId;
    const resolvedTemplateId = templateId || DEFAULT_TEMPLATE_ID;

    // Obter dados base (vazios ou mockados se veio de um template E includeSampleData for true)
    const baseData = (isFromTemplate && includeSampleData) ? getMockDataForTemplate(resolvedTemplateId) : {
        personalInfo: { fullName: '', title: '', email: '', phone: '', location: '', linkedin: '', portfolio: '', photoUrl: '' },
        summary: '',
        experiences: [],
        education: [],
        skills: [],
        projects: [],
    };

    const isEn = language === 'en';

    // Criar novo currículo
    const insertData: any = {
        ...baseData,
        templateId: resolvedTemplateId,
        appearance: {
            fontFamily: 'Inter',
            fontSize: '11',
            lineSpacing: '1.5',
            pageSize: 'A4',
        },
        sectionsConfig: [
            { id: 'personal', title: isEn ? 'Personal Information' : 'Informações Pessoais', type: 'STANDARD', active: true },
            { id: 'summary', title: isEn ? 'Professional Summary' : 'Resumo Profissional', type: 'STANDARD', active: true },
            { id: 'experience', title: isEn ? 'Work Experience' : 'Experiência Profissional', type: 'STANDARD', active: true },
            { id: 'education', title: isEn ? 'Education' : 'Formação Acadêmica', type: 'STANDARD', active: true },
            { id: 'projects', title: isEn ? 'Projects' : 'Projetos de Destaque', type: 'DATED_LIST', active: true },
            { id: 'skills', title: isEn ? 'Skills & Competencies' : 'Habilidades & Competências', type: 'STANDARD', active: true },
            { id: 'certifications', title: isEn ? 'Certifications' : 'Certificações', type: 'SIMPLE_LIST', active: false, items: [] },
            { id: 'languages', title: isEn ? 'Languages' : 'Idiomas', type: 'TEXT', active: false, content: '' },
            { id: 'volunteer', title: isEn ? 'Volunteering' : 'Voluntariado', type: 'DATED_LIST', active: false, items: [] },
        ],
        jobDescription: '',
        language: language,
    };

    const id = Date.now().toString();
    await saveResume(insertData, id);

    revalidatePath('/dashboard');
    revalidatePath('/');
    return { success: true, id };
}

export async function saveImportedResume(parsedData: any, templateId?: string, language: string = 'pt') {
    const localUserId = 'local-user';

    const rl = rateLimitById(localUserId, resumeActionLimit);
    if (!rl.allowed) {
		return { error: 'rate_limit', message: 'Please wait a moment before importing another resume.' };
    }

    const resolvedTemplateId = templateId || DEFAULT_TEMPLATE_ID;
    const isEn = language === 'en';
    const headers = parsedData._sectionHeaders || {};

    // Criar novo currículo mesclando a estrutura padrão do projeto com os dados parseados pela IA
    const insertData: any = {
        ...parsedData,
        templateId: resolvedTemplateId,
        appearance: {
            fontFamily: 'Inter',
            fontSize: '11',
            lineSpacing: '1.5',
            pageSize: 'A4',
        },
        sectionsConfig: [
            { id: 'personal', title: headers.personalInfo || (isEn ? 'Personal Information' : 'Informações Pessoais'), type: 'STANDARD', active: true },
            { id: 'summary', title: headers.summary || (isEn ? 'Professional Summary' : 'Resumo Profissional'), type: 'STANDARD', active: true },
            { id: 'experience', title: headers.experiences || (isEn ? 'Work Experience' : 'Experiência Profissional'), type: 'STANDARD', active: true },
            { id: 'education', title: headers.education || (isEn ? 'Education' : 'Formação Acadêmica'), type: 'STANDARD', active: true },
            { id: 'projects', title: headers.projects || (isEn ? 'Projects' : 'Projetos de Destaque'), type: 'DATED_LIST', active: true },
            { id: 'skills', title: headers.skills || (isEn ? 'Skills & Competencies' : 'Habilidades & Competências'), type: 'STANDARD', active: true },
            { id: 'certifications', title: headers.certifications || (isEn ? 'Certifications' : 'Certificações'), type: 'SIMPLE_LIST', active: !!parsedData.certifications?.length, items: parsedData.certifications || [] },
            { id: 'languages', title: headers.languages || (isEn ? 'Languages' : 'Idiomas'), type: 'TEXT', active: !!parsedData.languages?.length, content: '' },
            { id: 'volunteer', title: headers.volunteer || (isEn ? 'Volunteering' : 'Voluntariado'), type: 'DATED_LIST', active: !!parsedData.volunteer?.length, items: parsedData.volunteer || [] },
        ],
        jobDescription: parsedData.jobDescription || '',
        language: language,
    };

    // Se houve análise ATS, processar os scores
    if (parsedData.atsScore) {
        const ats = parsedData.atsScore;
        const designS = ats.scores?.design || 0;
        const estruturaS = ats.scores?.estrutura || 0;
        const conteudoS = ats.scores?.conteudo || 0;

        // Calcular média simples para o score principal se não existir um campo 'score' direto
        const totalScore = ats.score || Math.round((designS + estruturaS + conteudoS) / 3);

        insertData.score = totalScore;
        insertData.aiAnalysis = {
            ...ats,
            score: totalScore
        };
    }

    const id = Date.now().toString();
    await saveResume(insertData, id);

    revalidatePath('/dashboard');
    revalidatePath('/');
    return { success: true, id };
}

export async function deleteResume(id: string, language: string = 'pt') {
    const localUserId = 'local-user';

    const rl = rateLimitById(localUserId, resumeActionLimit);
    if (!rl.allowed) {
        const message = getTranslation('templates.rateLimitError', language as any);
        throw new Error(message);
    }

    const success = await deleteResumeLocal(id);
    if (!success) {
        logger.error('Error deleting resume', { id });
        throw new Error('Falha ao deletar currículo');
    }
    
    // No revalidatePath here - let the components handle their own state
}

export async function getResumeData(id: string, language: string = 'pt') {
    const localUserId = 'local-user';

    const rl = rateLimitById(localUserId, resumeActionLimit);
    if (!rl.allowed) {
        const message = getTranslation('templates.rateLimitError', language as any);
        throw new Error(message);
    }

    try {
        const data = await loadResume(id);
        return data;
    } catch (error) {
        logger.error('Failed to load resume', { id, error });
        throw new Error('Falha ao carregar currículo.');
    }
}

