import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getAtsParserSkill } from '@/lib/get-skill';
import { parseResumeChain } from '@/lib/ai/chains';
import { AISettings } from '@/store/useAISettingsStore';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extractSectionHeadersFromText(text: string): Record<string, string> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headers: Record<string, string> = {};
  
  const sectionPatterns: Record<string, string[]> = {
    summary: ['summary', 'profile', 'about me', 'about', 'resumo', 'objetivo', 'professional summary'],
    experiences: ['experience', 'employment', 'work history', 'professional experience', 'trabalho', 'experiência', 'career', 'career history'],
    education: ['education', 'academic', 'formação', 'formacao', 'escolaridade', 'academic background'],
    skills: ['skills', 'competencies', 'competências', 'habilidades', 'technical skills', 'knowledge', 'technologies'],
    certifications: ['certifications', 'certificates', 'certificados', 'certificações', 'certifications and courses'],
    projects: ['projects', 'projetos', 'portfolio', 'personal projects'],
    languages: ['languages', 'idiomas', 'language proficiency', 'spoken languages'],
    volunteer: ['volunteer', 'voluntariado', 'volunteering', 'community']
  };
  
  const isContentLine = (line: string): boolean => {
    if (/\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*present|present/i.test(line)) return true;
    if (line.includes('|')) return true;
    if (/\S+@\S+\.\S+|\b\d{10,}|linkedin|github|http/i.test(line)) return true;
    if (line.length > 60) return true;
    return false;
  };
  
  for (const line of lines) {
    if (isContentLine(line)) continue;
    const lowerLine = line.toLowerCase();
    for (const [sectionKey, patterns] of Object.entries(sectionPatterns)) {
      for (const pattern of patterns) {
        if (lowerLine === pattern || lowerLine.startsWith(pattern + ' ')) {
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
  console.log('[langchain-parse-resume] Route started');
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('[langchain-parse-resume] Inside stream start');
        const formData = await req.formData();
        const language = (formData.get('language') as string) || 'pt';
        const file = formData.get('file') as File;
        const aiSettingsJson = formData.get('aiSettings') as string;
        
        console.log('[langchain-parse-resume] File:', file?.name, 'type:', file?.type);
        
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
        
        const aiSettings: AISettings = aiSettingsJson ? JSON.parse(aiSettingsJson) : {
          provider: 'gemini',
          apiKey: process.env.GEMINI_API_KEY || '',
          model: 'gemini-2.0-flash',
          temperature: 0.2,
          topP: 0.9,
          topK: 40,
          maxTokens: 16384,
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
          frequencyPenalty: 0,
          presencePenalty: 0,
          timeout: 120000
        };
        
        if (!aiSettings.apiKey && aiSettings.provider === 'gemini') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'API Key Missing' })}\n\n`));
          controller.close();
          return;
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        let textContent = '';
        
        // PDF/DOCX extraction
        if (file.type === 'application/pdf') {
          const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const pdfData = await pdfParse(buffer);
          textContent = pdfData.text;
          // Normalize PDF text
          textContent = textContent.replace(/-\n/g, '');
          textContent = textContent.replace(/\n\n+/g, '\n\n');
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Convert to HTML first to preserve paragraph structure
          const htmlResult = await mammoth.convertToHtml({ buffer });
          let htmlText = htmlResult.value;
          htmlText = htmlText.replace(/<p[^>]*>/gi, '\n');
          htmlText = htmlText.replace(/<\/p>/gi, '');
          htmlText = htmlText.replace(/<br\s*\/?>/gi, '\n');
          htmlText = htmlText.replace(/<[^>]+>/g, '');
          htmlText = htmlText.replace(/&nbsp;/g, ' ');
          htmlText = htmlText.replace(/&amp;/g, '&');
          textContent = htmlText;
        } else {
          textContent = buffer.toString('utf-8');
        }
        
        if (!textContent || textContent.trim().length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Não foi possível extrair texto do arquivo' })}\n\n`));
          controller.close();
          return;
        }
        
        // Extract section headers from the raw text
        const sectionHeaders = extractSectionHeadersFromText(textContent);
        
        // Get skill and create prompt - same as original route
        const skill = getAtsParserSkill(language);
        const languageInstruction = language === 'pt' 
          ? 'Responda APENAS em português brasileiro.'
          : 'Respond ONLY in English.';
        
        const fullSkill = `${skill}\n\n${languageInstruction}`;
        const prompt = `CONTENT TO ANALYZE:\n${textContent}`;
        
        console.log('[langchain-parse-resume] Text extracted, length:', textContent.length);
        console.log('[langchain-parse-resume] Sending info to frontend...');
        
        // Send skill and prompt info - SAME FORMAT AS ORIGINAL
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', skill: fullSkill, prompt })}\n\n`));
        
        console.log('[langchain-parse-resume] Sending progress...');
        // Send progress message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Processando currículo com LangChain...' })}\n\n`));
        
        console.log('[langchain-parse-resume] Calling parseResumeChain...');
        // Call LangChain to parse the resume
        const generator = parseResumeChain({
          resumeContent: textContent,
          language: language as 'pt' | 'en',
          aiSettings
        });
        
        let fullContent = '';
        let hasChunks = false;
        
        for await (const result of generator) {
          hasChunks = true;
          if (result.type === 'chunk') {
            // Send streaming chunk - SAME FORMAT AS ORIGINAL
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
            } catch (e: any) {
              console.error('[langchain-parse-resume] Error sending chunk:', e.message);
            }
            fullContent += result.content;
          } else if (result.type === 'done') {
            const data = result.data;
            
            // Add section headers
            if (Object.keys(sectionHeaders).length > 0) {
              data._sectionHeaders = {
                ...(data._sectionHeaders || {}),
                ...sectionHeaders
              };
            }
            
            // Send done - SAME FORMAT AS ORIGINAL (with debug info)
            console.log('[langchain-parse-resume] Sending DONE message to frontend, data keys:', Object.keys(data));
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'done', 
                data,
                debug: {
                  skill: fullSkill,
                  userPrompt: prompt,
                  rawResponse: fullContent
                }
              })}\n\n`));
              console.log('[langchain-parse-resume] DONE message sent, closing controller');
            } catch (e: any) {
              console.error('[langchain-parse-resume] Error sending done:', e.message);
            }
          } else if (result.type === 'error') {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: result.error })}\n\n`));
            } catch (e: any) {
              console.error('[langchain-parse-resume] Error sending error:', e.message);
            }
          }
        }
        
        if (!hasChunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'LangChain não retornou dados - verifique as configurações da API' })}\n\n`));
        }
        
        controller.close();
        
      } catch (error: any) {
        console.error('Error in langchain-parse-resume:', error);
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
