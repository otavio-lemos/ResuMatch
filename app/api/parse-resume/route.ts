import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getAIClient, AIAuthSettings } from '@/app/actions/ai';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let skillUsed = '';
  let userPrompt = '';
  let rawResponse = '';
  let finalData: any;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'API Key Missing - Configure no menu Configurações' })}\n\n`));
          controller.close();
          return;
        }

        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'File Missing' })}\n\n`));
          controller.close();
          return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'File too large (Max 5MB)' })}\n\n`));
          controller.close();
          return;
        }

        const mimeType = file.type;
        const buffer = Buffer.from(await file.arrayBuffer());

        let pdfTextContent: string = '';

        if (mimeType === 'application/pdf') {
          try {
            const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
            const pdfData = await pdfParse(buffer);
            pdfTextContent = pdfData.text;
          } catch (e) {
            console.error("PDF parse error:", e);
          }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          pdfTextContent = (await mammoth.extractRawText({ buffer })).value;
        } else {
          pdfTextContent = buffer.toString('utf-8');
        }

        const authSettings: AIAuthSettings = aiSettings || {};
        const language = currentLanguage || 'pt';
        const languageInstruction = language === 'pt' 
          ? 'Extraia os dados do currículo rigorosamente para JSON. Use os nomes ORIGINAIS das seções em _sectionHeaders.'
          : 'Extract resume data strictly to JSON. Use ORIGINAL section names in _sectionHeaders.';

        let aiConfig;
        try {
          aiConfig = await getAIClient(authSettings);
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
          return;
        }

        const userInstructions = customPrompt ? `USER SPECIFIC RULES: ${customPrompt}\n\n` : '';
        
        let promptContent: string;
        let filePart: any = null;
        
        if (aiConfig.type === 'gemini' && mimeType === 'application/pdf') {
          const base64Data = buffer.toString('base64');
          filePart = {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf'
            }
          };
          promptContent = 'Analyze this resume PDF and extract all information to JSON format. Follow the system instructions strictly.';
        } else {
          promptContent = `CONTENT TO ANALYZE:\n${pdfTextContent}`;
        }

        skillUsed = getAtsParserSkill(currentLanguage) + '\n\n' + languageInstruction + '\n\n' + userInstructions;
        userPrompt = promptContent;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', skill: skillUsed, prompt: userPrompt })}\n\n`));

        if (aiConfig.type === 'gemini') {
          const contents: any[] = [];
          if (filePart) {
            contents.push({ parts: [filePart, { text: promptContent }] });
          } else {
            contents.push({ parts: [{ text: promptContent }] });
          }
          
          const streamingEndpoint = aiConfig.endpoint.replace(':generateContent', ':streamGenerateContent');
          const response = await fetch(streamingEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiConfig.apiKey },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: skillUsed }] },
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Too many requests. Please wait a moment.' })}\n\n`));
            } else {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI Error: ${errorText}` })}\n\n`));
            }
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader");

          const decoder = new TextDecoder();
          let bufferStr = '';
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bufferStr += decoder.decode(value, { stream: true });
            
            let startIdx = bufferStr.indexOf('{');
            while (startIdx !== -1) {
              let endIdx = -1;
              let stack = 0;
              for (let i = startIdx; i < bufferStr.length; i++) {
                if (bufferStr[i] === '{') stack++;
                else if (bufferStr[i] === '}') {
                  stack--;
                  if (stack === 0) { endIdx = i; break; }
                }
              }

              if (endIdx !== -1) {
                try {
                  const chunkStr = bufferStr.substring(startIdx, endIdx + 1);
                  const chunk = JSON.parse(chunkStr);
                  const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (text) {
                    fullText += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`));
                  }
                  bufferStr = bufferStr.substring(endIdx + 1);
                  startIdx = bufferStr.indexOf('{');
                } catch (e) { break; }
              } else { break; }
            }
          }
          rawResponse = fullText;
          finalData = robustJsonParse(fullText);
        } else {
          const stream = await aiConfig.client.chat.completions.create({
            model: aiConfig.model,
            messages: [{ role: 'system', content: skillUsed }, { role: 'user', content: userPrompt }],
            temperature: 0.1,
            stream: true,
            response_format: { type: 'json_object' },
          });

          let fullContent = '';
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: content })}\n\n`));
            }
          }
          rawResponse = fullContent;
          finalData = robustJsonParse(fullContent);
        }
        
        if (finalData) {
          ['experiences', 'education', 'projects'].forEach(section => {
            if (Array.isArray(finalData[section])) {
              finalData[section].forEach((item: any) => {
                if (Array.isArray(item.description)) {
                  item.description = item.description.map((d: string) => d.startsWith('-') ? d : `- ${d}`).join('\n');
                }
              });
            }
          });
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: finalData })}\n\n`));
        controller.close();

      } catch (error: any) {
        let errorMessage = error.message || 'Internal server error';
        if (error.status === 429) errorMessage = 'Too many requests.';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
