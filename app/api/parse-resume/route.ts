import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customPrompt = formData.get('importPrompt') as string;
    const aiSettings = formData.get('aiSettings') ? JSON.parse(formData.get('aiSettings') as string) : null;
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Chave de API não configurada." }, { status: 401 });
    if (!file) return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });

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
      model: aiSettings?.model || "gemini-3.0-flash-preview",
      systemInstruction: getAtsParserSkill(),
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const instruction = `Execute a Fase 1 (Importação/Parsing).`;
    const result = await model.generateContent([customPrompt ? `${customPrompt}\n${instruction}` : instruction, contentToAnalyze]);
    return NextResponse.json(robustJsonParse(result.response.text()));

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no parsing." }, { status: 500 });
  }
}
