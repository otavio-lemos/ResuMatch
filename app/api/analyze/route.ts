import { NextRequest, NextResponse } from 'next/server';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';
import { robustJsonParse } from '@/lib/ai-utils';
import { z, ZodError } from 'zod';
import { getAIClient, AIAuthSettings } from '@/app/actions/ai';

const analyzeSchema = z.object({
  resumeData: z.record(z.string(), z.any()).optional(),
  atsPrompt: z.string().optional(),
  jobDescription: z.string().optional(),
  aiSettings: z.object({
    provider: z.enum(['gemini', 'openai', 'ollama']).optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    baseUrl: z.string().optional()
  }).optional(),
  language: z.enum(['pt', 'en']).default('pt')
});

export async function POST(req: NextRequest) {
  let skillUsed = '';
  let userPrompt = '';
  let rawResponse = '';
  let finalData: any;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const validated = analyzeSchema.parse(body);
        
        const { resumeData, atsPrompt, jobDescription, aiSettings, language = 'pt' } = validated;
        
        const authSettings: AIAuthSettings = aiSettings || {};
        if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No provider or API key specified' })}\n\n`));
          controller.close();
          return;
        }

        let aiConfig;
        try {
          aiConfig = await getAIClient(authSettings);
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
          return;
        }

        const basePrompt = jobDescription
          ? `JOB DESCRIPTION: ${jobDescription}\n\nRESUME DATA (JSON): ${JSON.stringify(resumeData)}`
          : `RESUME DATA (JSON): ${JSON.stringify(resumeData)}`;

        const languageInstruction = language === 'en'
          ? 'CRITICAL: YOU MUST RESPOND IN ENGLISH. ALL JSON VALUES MUST BE IN ENGLISH.'
          : 'CRÍTICO: VOCÊ DEVE RESPONDER EM PORTUGUÊS. TODOS OS VALORES DO JSON DEVEM ESTAR EM PORTUGUÊS.';

        skillUsed = `${getAtsAnalyzerSkill(language)}\n\n${languageInstruction}`;
        userPrompt = atsPrompt ? `USER SPECIFIC RULES: ${atsPrompt}\n\n${basePrompt}` : basePrompt;

        // Send initial info
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', skill: skillUsed, prompt: userPrompt })}\n\n`));

        if (aiConfig.type === 'gemini') {
          // Use streaming endpoint for Gemini
          const streamingEndpoint = aiConfig.endpoint.replace(':generateContent', ':streamGenerateContent');
          const response = await fetch(streamingEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': aiConfig.apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: skillUsed }] },
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' })}\n\n`));
            } else {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI Provider Error (${response.status}): ${errorText}` })}\n\n`));
            }
            controller.close();
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
            
            // Process chunks from Gemini stream format
            // Gemini returns chunks like: [{"candidates": [...]}, {"candidates": [...]}]
            try {
              // Simple heuristic to extract text chunks from the stream
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === '[' || trimmed === ',' || trimmed === ']') continue;
                
                try {
                  const chunk = JSON.parse(trimmed.startsWith(',') ? trimmed.slice(1) : trimmed);
                  const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (text) {
                    fullText += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`));
                  }
                } catch (e) {
                  // Partial JSON, wait for next buffer
                  buffer = trimmed + buffer;
                }
              }
            } catch (e) {}
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
        console.error("Error in analyze:", error);
        let errorMessage = error.message || 'Internal server error';
        
        if (error.status === 429 || errorMessage.toLowerCase().includes('too many requests') || errorMessage.toLowerCase().includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        }

        if (error instanceof ZodError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Validation error', details: error.issues })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        }
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
