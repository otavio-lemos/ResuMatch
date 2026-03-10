import { NextRequest, NextResponse } from 'next/server';
import { saveResume, listResumes } from '@/lib/storage/resume-storage';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DEFAULT_SECTIONS_CONFIG = [
    { id: 'personal', title: 'Informações Pessoais', type: 'STANDARD', active: true },
    { id: 'summary', title: 'Resumo Profissional', type: 'STANDARD', active: true },
    { id: 'experience', title: 'Experiência Profissional', type: 'STANDARD', active: true },
    { id: 'education', title: 'Formação Acadêmica', type: 'STANDARD', active: true },
    { id: 'projects', title: 'Projetos de Destaque', type: 'DATED_LIST', active: true },
    { id: 'skills', title: 'Habilidades & Competências', type: 'STANDARD', active: true },
    { id: 'certifications', title: 'Certificações', type: 'SIMPLE_LIST', active: false, items: [] },
    { id: 'languages', title: 'Idiomas', type: 'TEXT', active: false, content: '' },
    { id: 'volunteer', title: 'Voluntariado', type: 'DATED_LIST', active: false, items: [] },
];

const DEFAULT_PERSONAL_INFO = {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    photoUrl: '',
};

export async function POST(request: NextRequest) {
    try {
        let aiSettings = undefined;
        let fileData: { buffer: Buffer, name: string, type: string } | null = null;
        let language = 'pt';

        const contentType = request.headers.get('content-type') || '';
        console.log(`[Import] Request Content-Type: ${contentType}`);

        if (contentType.includes('application/json')) {
            const body = await request.json();
            aiSettings = body.aiSettings;
            language = body.language || 'pt';
            if (body.file && body.file.base64) {
                const base64Data = body.file.base64.split(';base64,').pop();
                fileData = {
                    buffer: Buffer.from(base64Data, 'base64'),
                    name: body.file.name || 'resume.pdf',
                    type: body.file.type || 'application/pdf'
                };
            }
            console.log('[Import] Method: JSON (New)');
        } else {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const aiSettingsJson = formData.get('aiSettings') as string;
            language = (formData.get('language') as string) || 'pt';

            if (aiSettingsJson) aiSettings = JSON.parse(aiSettingsJson);
            if (file) {
                const bytes = await file.arrayBuffer();
                fileData = {
                    buffer: Buffer.from(bytes),
                    name: file.name,
                    type: file.type
                };
            }
            console.log(`[Import] Method: FormData (Old/Cached). Keys: ${Array.from(formData.keys()).join(', ')}`);
        }

        if (!fileData) {
            return NextResponse.json({ error: 'Arquivo não enviado ou inválido' }, { status: 400 });
        }

        if (aiSettings) {
            const maskedKey = aiSettings.apiKey ? `${aiSettings.apiKey.substring(0, 4)}...(${aiSettings.apiKey.length} chars)` : 'EMPTY';
            console.log(`[Import] AI Settings: Provider=${aiSettings.provider}, Key=${maskedKey}`);
        } else {
            console.warn('[Import] NO AI SETTINGS FOUND IN REQUEST');
        }

        // Extract text from file
        let text = '';
        const { buffer, name, type } = fileData;

        if (type === 'application/pdf' || name.endsWith('.pdf')) {
            const pdf = require('pdf-parse/lib/pdf-parse.js');
            const data = await pdf(buffer);
            text = data.text;
        } else if (name.endsWith('.docx')) {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            text = buffer.toString('utf-8');
        }

        if (!text.trim()) {
            return NextResponse.json({ error: 'Não foi possível extrair texto do arquivo' }, { status: 400 });
        }

        const { parseResumeFromText } = await import('@/app/actions/ai');
        console.log(`[Import] Text extracted (${text.length} chars). Starting IA parsing...`);

        // IA Extraction
        const extractedData = await parseResumeFromText(text, {
            ...aiSettings,
            importPrompt: aiSettings?.importPrompt
        }, language);
        console.log(`[Import] IA parsing done. Extracted fields:`, Object.keys(extractedData));

        const isEn = language === 'en';
        const headers = (extractedData as any)._sectionHeaders || {};

        // Build sectionsConfig
        const sectionsConfig = [
            { id: 'personal', title: headers.personalInfo || (isEn ? 'Personal Information' : 'Informações Pessoais'), type: 'STANDARD', active: true },
            { id: 'summary', title: headers.summary || (isEn ? 'Professional Summary' : 'Resumo Profissional'), type: 'STANDARD', active: !!extractedData.summary },
            { id: 'experience', title: headers.experiences || (isEn ? 'Work Experience' : 'Experiência Profissional'), type: 'STANDARD', active: (extractedData.experiences?.length || 0) > 0 },
            { id: 'education', title: headers.education || (isEn ? 'Education' : 'Formação Acadêmica'), type: 'STANDARD', active: (extractedData.education?.length || 0) > 0 },
            { id: 'projects', title: headers.projects || (isEn ? 'Projects' : 'Projetos de Destaque'), type: 'DATED_LIST', active: (extractedData.projects?.length || 0) > 0 },
            { id: 'skills', title: headers.skills || (isEn ? 'Skills & Competencies' : 'Habilidades & Competências'), type: 'STANDARD', active: (extractedData.skills?.length || 0) > 0 },
            { id: 'certifications', title: headers.certifications || (isEn ? 'Certifications' : 'Certificações'), type: 'SIMPLE_LIST', active: (extractedData.certifications?.length || 0) > 0, items: extractedData.certifications || [] },
            { id: 'languages', title: headers.languages || (isEn ? 'Languages' : 'Idiomas'), type: 'TEXT', active: (extractedData.languages?.length || 0) > 0, content: '' },
            { id: 'volunteer', title: headers.volunteer || (isEn ? 'Volunteering' : 'Voluntariado'), type: 'DATED_LIST', active: (extractedData.volunteer?.length || 0) > 0, items: extractedData.volunteer || [] },
        ];

        const finalData: any = {
            personalInfo: {
                ...DEFAULT_PERSONAL_INFO,
                ...(extractedData.personalInfo || {})
            },
            summary: extractedData.summary || '',
            experiences: extractedData.experiences || [],
            education: extractedData.education || [],
            skills: extractedData.skills || [],
            projects: extractedData.projects || [],
            sectionsConfig: sectionsConfig,
            language: language,
        };

        const resumeId = await saveResume(finalData);
        console.log(`[Import] Created local resume ${resumeId}. Content length check: exps=${finalData.experiences.length}`);

        return NextResponse.json({ success: true, resumeId, data: finalData }, { status: 201 });
    } catch (error: any) {
        logger.error('Import error', error);
        return NextResponse.json({ error: 'Erro ao processar currículo: ' + error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const resumes = await listResumes();
        return NextResponse.json(resumes);
    } catch (error: any) {
        return NextResponse.json({ error: 'Erro ao listar currículos' }, { status: 500 });
    }
}
