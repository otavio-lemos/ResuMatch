import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { checkRateLimit, addRateLimitHeaders } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const rateLimitResult = checkRateLimit('global', { windowMs: 60000, maxRequests: 10 });
  
  if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
          { error: "Limite de uso atingido. Tente novamente em 60 segundos." },
          { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetIn);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customPrompt = formData.get('importPrompt') as string;
    const aiSettings = formData.get('aiSettings') ? JSON.parse(formData.get('aiSettings') as string) : null;
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Chave de API não configurada." }, { status: 401 });
    if (!file) return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Arquivo muito grande. Máximo: 5MB` }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não suportado. Use PDF, DOCX ou TXT." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const mimeType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());

    let contentToAnalyze: any;
    if (mimeType === 'application/pdf') {
      contentToAnalyze = { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } };
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      contentToAnalyze = (await mammoth.extractRawText({ buffer })).value;
    } else {
      contentToAnalyze = buffer.toString('utf-8');
    }

    const model = genAI.getGenerativeModel({
      model: aiSettings?.model || "gemini-2.0-flash",
      systemInstruction: getAtsParserSkill(),
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const instruction = `Execute a Fase 1 (Importação/Parsing). Responda em português.`;
    const prompt = customPrompt ? `${customPrompt}\n${instruction}` : instruction;

    const stream = await model.generateContentStream([prompt, contentToAnalyze]);
    
    const encoder = new TextEncoder();
    let fullText = '';
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress message
          controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "upload", "message": "Arquivo carregado. Iniciando análise..."}\n\n`));
          
          controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "extracting", "message": "Extraindo texto do documento..."}\n\n`));
          
          // Stream the AI response
          for await (const chunk of stream.stream) {
            const text = chunk.text();
            fullText += text;
            controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(text)}}\n\n`));
          }
          
          controller.enqueue(encoder.encode(`data: {"type": "progress", "stage": "processing", "message": "Processando dados extraídos..."}\n\n`));
          
          // Parse and send final result
          try {
            const parsed = robustJsonParse(fullText);
            controller.enqueue(encoder.encode(`data: {"type": "complete", "data": ${JSON.stringify(parsed)}}\n\n`));
          } catch (parseError) {
            controller.enqueue(encoder.encode(`data: {"type": "error", "message": "Erro ao processar dados extraídos."}\n\n`));
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

  } catch (error: any) {
    console.error('Parse resume error:', error);
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(error.message || "Erro no parsing.")}}\n\n`));
        controller.close();
      }
    });
    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      status: 500
    });
  }
}
