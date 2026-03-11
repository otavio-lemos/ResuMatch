import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getAIClient, AIAuthSettings } from '@/app/actions/ai';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const currentLanguage = (formData.get('language') as string) || 'pt';

    const file = formData.get('file') as File;
    const customPrompt = formData.get('importPrompt') as string;
    const aiSettings = formData.get('aiSettings') ? JSON.parse(formData.get('aiSettings') as string) : null;
    
    // Verificar se provider é Ollama (não precisa de API key)
    const provider = aiSettings?.provider;
    const isOllama = provider === 'ollama' || provider === 'openai';
    const apiKey = aiSettings?.apiKey || process.env.GEMINI_API_KEY;

    // Se não é Ollama e não tem API key, erro
    if (!isOllama && !apiKey) {
      return new Response(`data: {"type": "error", "message": "API Key Missing - Configure no menu Configurações (ícone de engrenagem)"}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }

    if (!file) throw new Error("File Missing");
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (Max 5MB)`);
    }

    const mimeType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());

    let contentToAnalyze: any;
    let pdfTextContent: string = ''; // Store extracted PDF text for OpenAI/Ollama

    if (mimeType === 'application/pdf') {
      // For Gemini, we use inlineData
      contentToAnalyze = { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } };
      
      // For OpenAI/Ollama, we need to extract text
      try {
        const pdfData = await pdfParse(buffer);
        pdfTextContent = pdfData.text;
      } catch (e) {
        console.error("PDF parse error:", e);
        // If we can't parse PDF, we'll still try to send it to Gemini if selected
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      contentToAnalyze = (await mammoth.extractRawText({ buffer })).value;
      pdfTextContent = contentToAnalyze;
    } else {
      contentToAnalyze = buffer.toString('utf-8');
      pdfTextContent = contentToAnalyze;
    }

    // Get AI Client configuration
    const authSettings: AIAuthSettings = aiSettings || {};
    // If no provider is specified, default to Gemini if API key exists, otherwise error
    if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
        return new Response(`data: {"type": "error", "message": "No provider or API key specified"}\n\n`, {
          headers: { 'Content-Type': 'text/event-stream' }
        });
    }

    let aiConfig;
    try {
        aiConfig = await getAIClient(authSettings);
    } catch (error: any) {
        return new Response(`data: {"type": "error", "message": ${JSON.stringify(error.message)}}\n\n`, {
          headers: { 'Content-Type': 'text/event-stream' }
        });
    }

    const userInstructions = customPrompt ? `USER SPECIFIC RULES: ${customPrompt}\n\n` : '';
    
    // Determine content for prompt based on provider
    let promptContent: string;
    if (aiConfig.type === 'gemini') {
      // For Gemini, inlineData is handled separately in requestBody
      // Just provide a placeholder text reference in the prompt
      promptContent = mimeType === 'application/pdf' ? '[PDF CONTENT ATTACHED]' : `CONTENT TO ANALYZE:\n${pdfTextContent}`;
    } else {
      // For OpenAI/Ollama, we must pass text content
      promptContent = `CONTENT TO ANALYZE:\n${pdfTextContent}`;
    }
    
    const finalPrompt = `${userInstructions}Execute a Fase 1 (Extração de Dados). ${promptContent}`;

    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        let controllerClosed = false;
        const safeEnqueue = (data: string) => {
          if (!controllerClosed) {
            try { controller.enqueue(encoder.encode(data)); } catch (e) { controllerClosed = true; }
          }
        };
        const safeClose = () => {
          if (!controllerClosed) {
            try { controller.close(); } catch (e) {}
            controllerClosed = true;
          }
        };
        
        // Send initial progress message for transparency
        safeEnqueue(`data: ${JSON.stringify({ type: 'progress', message: '🔧 Carregando skill de parser...' })}\n\n`);
        
        // Send the skill being used
        const skillContent = getAtsParserSkill(currentLanguage);
        safeEnqueue(`data: ${JSON.stringify({ type: 'skill', content: '📋 SKILL:\n' + skillContent.substring(0, 500) + '...' })}\n\n`);
        
        const modelName = 'model' in aiConfig ? aiConfig.model : 'gemini';
        safeEnqueue(`data: ${JSON.stringify({ type: 'progress', message: '📤 Enviando para IA: ' + aiConfig.type + ' | Model: ' + modelName })}\n\n`);
        safeEnqueue(`data: ${JSON.stringify({ type: 'prompt', content: '📝 PROMPT ENVIADO:\n' + finalPrompt.substring(0, 1000) + '...' })}\n\n`);
        
        try {
          if (aiConfig.type === 'gemini') {
            // Gemini Logic (using fetch)
            const requestBody = {
              contents: [
                { 
                  parts: [
                    { text: finalPrompt },
                    ...(mimeType === 'application/pdf' ? [contentToAnalyze] : [])
                  ] 
                }
              ],
              systemInstruction: { parts: [{ text: getAtsParserSkill(currentLanguage) }] },
              generationConfig: { temperature: 0.1 }
            };

            const response = await fetch(aiConfig.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': aiConfig.apiKey
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorText = await response.text();
              safeEnqueue(`data: {"type": "error", "message": ${JSON.stringify(errorText)}}\n\n`);
              safeClose();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
            }
            
            const finalJson = JSON.parse(buffer);
            if (Array.isArray(finalJson)) {
              for (const item of finalJson) {
                const text = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
                fullText += text;
                safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
              }
            } else {
              const text = finalJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              fullText = text;
              safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            }
            
            const finalData = robustJsonParse(fullText);
            safeEnqueue(`data: ${JSON.stringify({ type: 'complete', data: finalData })}\n\n`);
            safeClose();

          } else {
            // OpenAI / Ollama Logic
            // Note: PDF support for OpenAI/Ollama requires vision capabilities or external OCR
            // This implementation assumes text input or handled PDF content via base64 in prompt (not ideal)
            // We will pass the text content.
            
            const stream = await aiConfig.client.chat.completions.create({
              model: aiConfig.model,
              messages: [
                { role: 'system', content: getAtsParserSkill(currentLanguage) },
                { role: 'user', content: finalPrompt }
              ],
              temperature: aiConfig.temperature,
              stream: true,
            });

            let fullText = '';

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                fullText += content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: content })}\n\n`));
              }
            }

            const finalData = robustJsonParse(fullText);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: finalData })}\n\n`));
            controller.close();
          }
    } catch (error: any) {
      console.error("Error in parse-resume stream:", error);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
      controller.close();
    }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("Error in parse-resume:", error);
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(error.message)}}\n\n`));
        controller.close();
      }
    });
    return new Response(errorStream, { headers: { 'Content-Type': 'text/event-stream' } });
  }
}
