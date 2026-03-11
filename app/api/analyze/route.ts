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
  try {
    const body = await req.json();
    const validated = analyzeSchema.parse(body);
    
    const { resumeData, atsPrompt, jobDescription, aiSettings, language = 'pt' } = validated;
    
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

    const basePrompt = jobDescription
      ? `JOB DESCRIPTION: ${jobDescription}\n\nRESUME DATA (JSON): ${JSON.stringify(resumeData)}`
      : `RESUME DATA (JSON): ${JSON.stringify(resumeData)}`;

    const userInstructions = atsPrompt ? `USER SPECIFIC RULES: ${atsPrompt}\n\n` : '';
    const finalPrompt = `${userInstructions}${basePrompt}`;
    
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        // Send initial progress message for transparency
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Iniciando análise ATS...' })}\n\n`));
        
        try {
          if (aiConfig.type === 'gemini') {
            // Gemini Logic (using fetch as before)
            const response = await fetch(aiConfig.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': aiConfig.apiKey
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                systemInstruction: { parts: [{ text: getAtsAnalyzerSkill(language) }] },
                generationConfig: { temperature: 0.2 }
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(errorText)}}\n\n`));
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
            }

            const finalJson = JSON.parse(buffer);
            // Gemini returns an array for streamGenerateContent
            if (Array.isArray(finalJson)) {
              for (const item of finalJson) {
                const text = item.candidates?.[0]?.content?.parts?.[0]?.text || '';
                fullText += text;
                controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(text)}}\n\n`));
              }
            } else {
              const text = finalJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              fullText = text;
              controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(text)}}\n\n`));
            }

            const parsed = robustJsonParse(fullText);
            controller.enqueue(encoder.encode(`data: {"type": "complete", "data": ${JSON.stringify(parsed)}}\n\n`));
            controller.close();

          } else {
            // OpenAI / Ollama Logic (using SDK)
            const stream = await aiConfig.client.chat.completions.create({
              model: aiConfig.model,
              messages: [
                { role: 'system', content: getAtsAnalyzerSkill(language) },
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
                controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(content)}}\n\n`));
              }
            }

            const parsed = robustJsonParse(fullText);
            controller.enqueue(encoder.encode(`data: {"type": "complete", "data": ${JSON.stringify(parsed)}}\n\n`));
            controller.close();
          }
    } catch (error: any) {
      console.error("Error in analyze stream:", error);
      controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(error.message)}}\n\n`));
      controller.close();
    }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("Error in analyze:", error);
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
