import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getAIClient, AIAuthSettings } from '@/app/actions/ai';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const currentLanguage = (formData.get('language') as string) || 'pt';

    const file = formData.get('file') as File;
    const customPrompt = formData.get('importPrompt') as string;
    const aiSettings = formData.get('aiSettings') ? JSON.parse(formData.get('aiSettings') as string) : null;
    
    const provider = aiSettings?.provider;
    const isOllama = provider === 'ollama' || provider === 'openai';
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    if (!isOllama && !apiKey) {
      return NextResponse.json(
        { error: 'API Key Missing - Configure no menu Configurações' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'File Missing' }, { status: 400 });
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (Max 5MB)' }, { status: 400 });
    }

    const mimeType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());

    let contentToAnalyze: any;
    let pdfTextContent: string = '';

    if (mimeType === 'application/pdf') {
      contentToAnalyze = { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } };
      try {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const pdfData = await pdfParse(buffer);
        pdfTextContent = pdfData.text;
      } catch (e) {
        console.error("PDF parse error:", e);
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      contentToAnalyze = (await mammoth.extractRawText({ buffer })).value;
      pdfTextContent = contentToAnalyze;
    } else {
      contentToAnalyze = buffer.toString('utf-8');
      pdfTextContent = contentToAnalyze;
    }

    const authSettings: AIAuthSettings = aiSettings || {};
    if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No provider or API key specified' }, { status: 400 });
    }

    const language = currentLanguage || 'pt';
    const languageInstruction = language === 'pt' 
      ? 'Responda APENAS em português brasileiro. Use nomes de seções em Português.' 
      : 'Respond ONLY in English. Use section names in English.';

    let aiConfig;
    try {
      aiConfig = await getAIClient(authSettings);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userInstructions = customPrompt ? `USER SPECIFIC RULES: ${customPrompt}\n\n` : '';
    const fullLanguageInstruction = `${languageInstruction}\n\n${userInstructions}`;
    
    let promptContent: string;
    if (aiConfig.type === 'gemini') {
      promptContent = mimeType === 'application/pdf' ? '[PDF CONTENT ATTACHED]' : `CONTENT TO ANALYZE:\n${pdfTextContent}`;
    } else {
      promptContent = `CONTENT TO ANALYZE:\n${pdfTextContent}`;
    }

    let finalData: any;

    if (aiConfig.type === 'gemini') {
      const response = await fetch(aiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': aiConfig.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptContent }] }],
          systemInstruction: { parts: [{ text: getAtsParserSkill(currentLanguage) + '\n\n' + fullLanguageInstruction }] },
          generationConfig: { temperature: 0.2 }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: errorText }, { status: 500 });
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let bufferStr = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferStr += decoder.decode(value, { stream: true });
      }

      const finalJson = JSON.parse(bufferStr);
      let fullText = '';

      if (Array.isArray(finalJson)) {
        for (const item of finalJson) {
          const text = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
          fullText += text;
        }
      } else {
        fullText = finalJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      
      finalData = robustJsonParse(fullText);

    } else {
      const stream = await aiConfig.client.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: getAtsParserSkill(currentLanguage) + '\n\n' + fullLanguageInstruction },
          { role: 'user', content: promptContent }
        ],
        temperature: aiConfig.temperature,
        stream: false,
      });

      const content = stream.choices[0]?.message?.content || '';
      finalData = robustJsonParse(content);
    }

    return NextResponse.json({ data: finalData });

  } catch (error: any) {
    console.error("Error in parse-resume:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
