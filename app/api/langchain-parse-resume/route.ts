import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
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
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await req.formData();
        const language = (formData.get('language') as string) || 'pt';
        const file = formData.get('file') as File;
        const aiSettingsJson = formData.get('aiSettings') as string;
        
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
        
        if (file.type === 'application/pdf') {
          const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const pdfData = await pdfParse(buffer);
          textContent = pdfData.text;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          textContent = (await mammoth.extractRawText({ buffer })).value;
        } else {
          textContent = buffer.toString('utf-8');
        }
        
        const sectionHeaders = extractSectionHeadersFromText(textContent);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', message: 'Processing with LangChain...' })}\n\n`));
        
        const generator = parseResumeChain({
          resumeContent: textContent,
          language: language as 'pt' | 'en',
          aiSettings
        });
        
        let fullContent = '';
        
        for await (const result of generator) {
          if (result.type === 'chunk') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
            fullContent += result.content;
          } else if (result.type === 'done') {
            const data = result.data;
            if (Object.keys(sectionHeaders).length > 0) {
              data._sectionHeaders = {
                ...(data._sectionHeaders || {}),
                ...sectionHeaders
              };
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data })}\n\n`));
          } else if (result.type === 'error') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: result.error })}\n\n`));
          }
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
