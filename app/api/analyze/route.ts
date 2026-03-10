import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { z, ZodError } from 'zod';
import { checkRateLimit, addRateLimitHeaders } from '@/lib/rate-limit';

const analyzeSchema = z.object({
  resumeData: z.record(z.string(), z.any()).optional(),
  atsPrompt: z.string().optional(),
  jobDescription: z.string().optional(),
  aiSettings: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  language: z.enum(['pt', 'en']).default('pt')
});

export async function POST(req: NextRequest) {
    const rateLimitResult = checkRateLimit('global', { windowMs: 60000, maxRequests: 10 });
    
    if (!rateLimitResult.allowed) {
        const response = NextResponse.json(
            { error: "Limite de uso da IA atingido. Tente novamente em 60 segundos." },
            { status: 429 }
        );
        return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetIn);
    }

  try {
    const body = await req.json();
    const validated = analyzeSchema.parse(body);
    
    const { resumeData, atsPrompt, jobDescription, aiSettings, language = 'pt' } = validated;
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Chave de API não configurada." }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: aiSettings?.model || "gemini-2.0-flash",
      systemInstruction: getAtsAnalyzerSkill(language),
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const filteredData = { ...resumeData };

    const allData = {
      personalInfo: filteredData.personalInfo,
      summary: filteredData.summary || '',
      experiences: filteredData.experiences || [],
      education: filteredData.education || [],
      skills: filteredData.skills || [],
      projects: filteredData.projects || [],
      sectionsConfig: filteredData.sectionsConfig || [],
      languages: filteredData.languages || [],
      certifications: filteredData.certifications || [],
      volunteer: filteredData.volunteer || [],
    };

    const isJobMatch = !!jobDescription;
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

    const stream = await model.generateContentStream([userPrompt]);
    
    const encoder = new TextEncoder();
    let fullText = '';
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress message
          if (isJobMatch) {
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "start", "message": "Iniciando análise de compatibilidade com a vaga..."}\n\n`));
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "analyzing", "message": "Analisando seu currículo em relação aos requisitos da vaga..."}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "start", "message": "Iniciando auditoria ATS..."}\n\n`));
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "analyzing", "message": "Analisando palavras-chave e estrutura..."}\n\n`));
          }
          
          // Stream the AI response
          for await (const chunk of stream.stream) {
            const text = chunk.text();
            fullText += text;
            controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(text)}}\n\n`));
          }
          
          if (isJobMatch) {
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "scoring", "message": "Calculando score de compatibilidade..."}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "scoring", "message": "Calculando scores de Design, Estrutura e Conteúdo..."}\n\n`));
          }
          
          // Parse and send final result
          try {
            const parsed = robustJsonParse(fullText);
            controller.enqueue(encoder.encode(`data: {"type": "complete", "data": ${JSON.stringify(parsed)}}\n\n`));
          } catch (parseError) {
            controller.enqueue(encoder.encode(`data: {"type": "error", "message": "Erro ao processar análise."}\n\n`));
          }
          
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(error.message || "Erro desconhecido")}}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: {"type": "error", "message": "Validação falhou"}\n\n`));
          controller.close();
        }
      });
      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
        },
        status: 400
      });
    }
    const message = error instanceof Error ? error.message : "Erro na análise.";
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(message)}}\n\n`));
        controller.close();
      }
    });
    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
      status: 500
    });
  }
}
