import { NextRequest, NextResponse } from 'next/server';
import { analyzeATSChain } from '@/lib/ai/chains';
import { AISettings } from '@/store/useAISettingsStore';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const { resumeData, jobDescription, language = 'pt', aiSettings } = body;
        
        if (!aiSettings?.apiKey && aiSettings?.provider === 'gemini') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'API Key Missing' })}\n\n`));
          controller.close();
          return;
        }
        
        const settings: AISettings = aiSettings || {
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
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', message: 'Analyzing with LangChain...' })}\n\n`));
        
        const generator = analyzeATSChain({
          resumeData,
          jobDescription,
          language,
          aiSettings: settings
        });
        
        for await (const result of generator) {
          if (result.type === 'chunk') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
          } else if (result.type === 'done') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: result.data })}\n\n`));
          } else if (result.type === 'error') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: result.error })}\n\n`));
          }
        }
        
        controller.close();
        
      } catch (error: any) {
        console.error('Error in langchain-analyze:', error);
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
