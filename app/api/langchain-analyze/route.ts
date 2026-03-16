import { NextRequest, NextResponse } from 'next/server';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';
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
        
        const skill = getAtsAnalyzerSkill(language);
        const languageInstruction = language === 'pt'
          ? 'Responda APENAS em português.'
          : 'Respond ONLY in English.';
        
        const fullSkill = `${skill}\n\n${languageInstruction}`;
        const jdString = typeof jobDescription === 'string' ? jobDescription : '';
        const prompt = jdString
          ? `JOB DESCRIPTION:\n${jdString}\n\nRESUME DATA:\n${JSON.stringify(resumeData)}`
          : `RESUME DATA:\n${JSON.stringify(resumeData)}`;
        
        console.log('[langchain-analyze] Calling analyzeATSChain...');
        
        const safeJobDescription = typeof jobDescription === 'string' ? jobDescription : undefined;
        
        const generator = analyzeATSChain({
          resumeData,
          jobDescription: safeJobDescription,
          language,
          aiSettings: settings
        });
        
        let fullContent = '';
        let hasChunks = false;
        
        for await (const result of generator) {
          hasChunks = true;
          if (result.type === 'chunk') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
            fullContent += result.content;
          } else if (result.type === 'done') {
            console.log('[langchain-analyze] Sending DONE, data keys:', Object.keys(result.data));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'done', 
              data: result.data,
              debug: {
                skill: fullSkill,
                userPrompt: prompt,
                rawResponse: fullContent
              }
            })}\n\n`));
          } else if (result.type === 'error') {
            console.error('[langchain-analyze] Error from chain:', result.error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: result.error })}\n\n`));
          }
        }
        
        if (!hasChunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No data returned from AI' })}\n\n`));
        }
        
        console.log('[langchain-analyze] Closing controller');
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
