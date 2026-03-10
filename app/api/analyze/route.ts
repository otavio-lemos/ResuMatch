import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';


const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let lastCleanup = Date.now();

const cleanupRateLimitMap = () => {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.lastReset > RATE_LIMIT_WINDOW_MS) {
            rateLimitMap.delete(ip);
        }
    }
    lastCleanup = now;
};

export async function POST(req: NextRequest) {
    cleanupRateLimitMap();

    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowMs = RATE_LIMIT_WINDOW_MS;

    const userRate = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    if (now - userRate.lastReset > windowMs) {
        userRate.count = 0;
        userRate.lastReset = now;
    }

    if (userRate.count >= 10) {
        return NextResponse.json(
            { error: "Limite de uso da IA atingido. Tente novamente em 60 segundos." },
            { status: 429 }
        );
    }

    userRate.count++;
    rateLimitMap.set(ip, userRate);

  try {
    const { resumeData, atsPrompt, jobDescription, aiSettings, language = 'pt' } = await req.json();
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Chave de API não configurada." }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: aiSettings?.model || "gemini-3.0-flash-preview",
      systemInstruction: getAtsAnalyzerSkill(language),
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    // ENVIAR TODOS OS CAMPOS PREENCHIDOS PARA A IA
    // Não filtrar por seção ativa - analisar tudo que existir
    const filteredData = { ...resumeData };

    // Garantir que todos os campos existentes sejam enviados
    // Se o campo existe e tem conteúdo, deve ser analisado
    const allData = {
      personalInfo: filteredData.personalInfo,
      summary: filteredData.summary || '',
      experiences: filteredData.experiences || [],
      education: filteredData.education || [],
      skills: filteredData.skills || [],
      projects: filteredData.projects || [],
      // Incluir todas as seções configuradas
      sectionsConfig: filteredData.sectionsConfig || [],
      // Campos adicionais
      languages: filteredData.languages || [],
      certifications: filteredData.certifications || [],
      volunteer: filteredData.volunteer || [],
    };

    const prompt = jobDescription
      ? language === 'en'
        ? `Execute Action 2 (Audit) with JOB MATCH. JOB: ${jobDescription}. DATA: ${JSON.stringify(allData)}`
        : `Execute a Fase 2 (Auditoria) com MATCH DE VAGA. VAGA: ${jobDescription}. DATA: ${JSON.stringify(allData)}`
      : language === 'en'
        ? `Execute Action 2 (General Audit). DATA: ${JSON.stringify(allData)}`
        : `Execute a Fase 2 (Auditoria Geral). DATA: ${JSON.stringify(allData)}`;

    const userPrompt = atsPrompt
      ? language === 'en'
        ? `Additional user instruction: ${atsPrompt}\n\n${prompt}`
        : `Instrução adicional do usuário: ${atsPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent([userPrompt]);
    return NextResponse.json(robustJsonParse(result.response.text()));

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro na análise." }, { status: 500 });
  }
}
