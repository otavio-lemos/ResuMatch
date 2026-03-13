import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { getAIClient, AIAuthSettings } from '@/app/actions/ai';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Extract section headers from raw text by detecting lines that look like section titles
function extractSectionHeadersFromText(text: string): Record<string, string> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headers: Record<string, string> = {};
  
  // Common section name patterns to detect (case insensitive)
  const sectionPatterns: Record<string, string[]> = {
    summary: ['summary', 'profile', 'about me', 'about', 'resumo', 'objetivo', 'professional summary'],
    experiences: ['experience', 'employment', 'work history', 'professional experience', 'trabalho', 'experiência', 'career', 'career history'],
    education: ['education', 'academic', 'formação', 'formacao', 'escolaridade', 'academic background'],
    skills: ['skills', 'competencies', 'competências', 'habilidades', 'technical skills', 'knowledge', 'technologies'],
    certifications: ['certifications', 'certificates', 'certificados', 'certificações', 'certifications', 'certifications and courses'],
    projects: ['projects', 'projetos', 'portfolio', 'personal projects'],
    languages: ['languages', 'idiomas', 'language proficiency', 'spoken languages'],
    volunteer: ['volunteer', 'voluntariado', 'volunteering', 'community']
  };
  
  // Skip lines that contain certain patterns (likely content, not headers)
  const isContentLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    // Skip if line has date patterns
    if (/\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*present|present/i.test(line)) return true;
    // Skip if line has | (pipe often indicates content, not header)
    if (line.includes('|')) return true;
    // Skip if line has email, phone, url
    if (/\S+@\S+\.\S+|\b\d{10,}|linkedin|github|http/i.test(line)) return true;
    // Skip if line is very long (probably content)
    if (line.length > 60) return true;
    return false;
  };
  
  // Find lines that are likely section headers (standalone, short, followed by content)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Skip content lines
    if (isContentLine(line)) continue;
    
    // Check if line matches any section pattern
    for (const [sectionKey, patterns] of Object.entries(sectionPatterns)) {
      for (const pattern of patterns) {
        // Exact match or line starts with pattern
        if (lowerLine === pattern || lowerLine.startsWith(pattern + ' ') || lowerLine === ' ' + pattern) {
          // Only set if not already set
          if (!headers[sectionKey]) {
            headers[sectionKey] = line;
          }
          break;
        }
      }
    }
  }
  
  return headers;
}

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
            console.log('[PARSE-RESUME] PDF extracted text (first 2000 chars):', pdfTextContent.substring(0, 2000));
          } catch (e) {
            console.error("PDF parse error:", e);
          }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          pdfTextContent = (await mammoth.extractRawText({ buffer })).value;
          console.log('[PARSE-RESUME] DOCX extracted text (first 2000 chars):', pdfTextContent.substring(0, 2000));
        } else {
          pdfTextContent = buffer.toString('utf-8');
        }

        // Extract section headers from the raw text BEFORE sending to AI
        // This helps both Gemini and Ollama get the section names
        const sectionHeadersFromText = extractSectionHeadersFromText(pdfTextContent);
        console.log('[PARSE-RESUME] Detected section headers from text:', sectionHeadersFromText);

        const authSettings: AIAuthSettings = aiSettings || {};
        if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No provider or API key specified' })}\n\n`));
          controller.close();
          return;
        }

        const language = currentLanguage || 'pt';
        // Force explicit language instruction for local/Ollama models
        const languageInstruction = language === 'pt' 
          ? 'Responda APENAS em português brasileiro. PRESTAÇÃO DE CONTAS: Você DEVE capturar os NOMES EXATOS das seções no _sectionHeaders - use o texto original do documento, não traduza.'
          : 'Respond ONLY in English. IMPORTANT: You MUST capture the EXACT section names in _sectionHeaders - use the original text from the document, do NOT translate.';

        let aiConfig;
        try {
          aiConfig = await getAIClient(authSettings);
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
          return;
        }

        const userInstructions = customPrompt ? `USER SPECIFIC RULES: ${customPrompt}\n\n` : '';
        
        // Include detected section headers in the prompt to help the AI
        const detectedHeadersStr = Object.keys(sectionHeadersFromText).length > 0
          ? `\n\nSection headers found in document: ${Object.values(sectionHeadersFromText).join(', ')}`
          : '';
          
        const fullLanguageInstruction = `${languageInstruction}\n\n${userInstructions}${detectedHeadersStr}`;
        
        let promptContent: string;
        let filePart: any = null;
        
        // For Gemini with PDF, send the PDF directly as base64
        if (aiConfig.type === 'gemini' && mimeType === 'application/pdf') {
          const base64Data = Buffer.from(await file.arrayBuffer()).toString('base64');
          const mimeTypePdf = 'application/pdf';
          filePart = {
            inlineData: {
              data: base64Data,
              mimeType: mimeTypePdf
            }
          };
          promptContent = 'Analyze this resume PDF and extract all information to JSON format. Pay special attention to section headers - use the EXACT section names from the document.' + detectedHeadersStr;
        } else if (aiConfig.type === 'gemini') {
          promptContent = `CONTENT TO ANALYZE:\n${pdfTextContent}${detectedHeadersStr}`;
        } else {
          promptContent = `CONTENT TO ANALYZE:\n${pdfTextContent}${detectedHeadersStr}`;
        }

        skillUsed = getAtsParserSkill(currentLanguage) + '\n\n' + fullLanguageInstruction;
        userPrompt = promptContent;

        // Send skill and prompt info immediately
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', skill: skillUsed, prompt: userPrompt })}\n\n`));

        if (aiConfig.type === 'gemini') {
          // Build contents with file part if PDF
          const contents: any[] = [];
          if (filePart) {
            contents.push({
              parts: [
                filePart,
                { text: promptContent }
              ]
            });
          } else {
            contents.push({
              parts: [{ text: promptContent }]
            });
          }
          
          const response = await fetch(aiConfig.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': aiConfig.apiKey
            },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: skillUsed }] },
              generationConfig: { temperature: 0.2, responseModalities: 'TEXT' }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorText })}\n\n`));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available");

          const decoder = new TextDecoder();
          let bufferStr = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bufferStr += decoder.decode(value, { stream: true });
            
            // Send chunk progress
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Recebendo resposta da IA...' })}\n\n`));
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
          
          rawResponse = fullText;
          finalData = robustJsonParse(fullText);

        } else {
          // Ollama/OpenAI with streaming
          const stream = await aiConfig.client.chat.completions.create({
            model: aiConfig.model,
            messages: [
              { role: 'system', content: skillUsed },
              { role: 'user', content: userPrompt }
            ],
            temperature: aiConfig.temperature,
            stream: true,
            response_format: { type: 'json_object' },
          });

          let fullContent = '';
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              // Send streaming chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: content })}\n\n`));
            }
          }
          
          rawResponse = fullContent;
          finalData = robustJsonParse(fullContent);
        }

        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'done', 
          data: finalData,
          debug: {
            skill: skillUsed,
            userPrompt: userPrompt,
            rawResponse: rawResponse
          }
        })}\n\n`));

        controller.close();

      } catch (error: any) {
        console.error("Error in parse-resume:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\n`));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
