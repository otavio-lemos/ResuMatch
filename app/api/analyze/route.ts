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
    baseUrl: z.string().optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional(),
    maxTokens: z.number().optional()
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
        
        // DEBUG: Log received settings
        console.log('[ANALYZE] Received aiSettings:', JSON.stringify(aiSettings));
        console.log('[ANALYZE] ENV GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
        
        if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No provider or API key specified' })}\n\n`));
          controller.close();
          return;
        }

        const provider = authSettings?.provider;
        
        let aiConfig;
        try {
          aiConfig = await getAIClient(authSettings);
          console.log('[ANALYZE] aiConfig type:', aiConfig.type);
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
          return;
        }

        const basePrompt = jobDescription
          ? `JOB DESCRIPTION: ${jobDescription}\n\nRESUME DATA (JSON): ${JSON.stringify(resumeData)}`
          : `RESUME DATA (JSON): ${JSON.stringify(resumeData)}`;

        // Force language instruction for Ollama/local models that may ignore skill language directives
        const languageInstruction = language === 'en'
          ? 'CRITICAL INSTRUCTION: Your entire response MUST be in ENGLISH. All labels, feedback, suggestions, and JSON keys MUST be in English. Example: label: string NOT label: string (no Portuguese). FAILURE TO COMPLY WILL RESULT IN INCORRECT OUTPUT.'
          : 'CRITICAL INSTRUCTION: Responda APENAS em português. Todas as etiquetas, feedbacks e sugestões DEVEM estar em português. Exemplo: estrutura não structure, feedback não feedback. FALHA EM OBEDECER IRÁ RESULTAR EM SAÍDA INCORRETA.';

        const userInstructions = atsPrompt ? `USER SPECIFIC RULES: ${atsPrompt}\n\n` : '';
        const finalPrompt = `${languageInstruction}\n\n${userInstructions}${basePrompt}`;

        skillUsed = getAtsAnalyzerSkill(language);
        userPrompt = finalPrompt;

        // Send initial info
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'info', skill: skillUsed, prompt: userPrompt })}\n\n`));

        if (aiConfig.type === 'gemini') {
          const response = await fetch(aiConfig.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': aiConfig.apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: finalPrompt }] }],
              systemInstruction: { parts: [{ text: skillUsed }] },
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
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
            }
          } else {
            fullText = finalJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
          
          rawResponse = fullText;
          finalData = robustJsonParse(fullText);

        } else if (provider === 'ollama') {
          // Ollama native API with streaming using manual fetch to /api/generate
          
          // Determine the base URL (remove /v1 suffix if present)
          let ollamaBaseUrl = aiConfig.client.baseURL.replace('/v1', '');
          // Add protocol if missing
          if (!ollamaBaseUrl.startsWith('http')) {
            ollamaBaseUrl = 'http://' + ollamaBaseUrl;
          }
          const ollamaUrl = `${ollamaBaseUrl}/api/generate`;
          
          // Combine system skill and user prompt
          const fullPrompt = `${skillUsed}\n\n${userPrompt}`;
          
          // 15s timeout to detect if Ollama is running
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60s timeout for Ollama to start
          
          try {
            const response = await fetch(ollamaUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: abortController.signal,
              body: JSON.stringify({
                model: aiConfig.model,
                prompt: fullPrompt,
                stream: true,
                options: {
                  temperature: aiConfig.temperature,
                  top_p: aiConfig.topP,
                  num_predict: aiConfig.maxTokens,
                }
              })
            });
            
            clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[ANALYZE-OLLAMA] HTTP Error:', response.status, errorText);
            throw new Error(`Ollama error: ${response.status} ${errorText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available for Ollama stream");

          const decoder = new TextDecoder();
          let fullContent = '';
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  chunkCount++;
                  fullContent += json.response;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: json.response })}\n\n`));
                }
                if (json.done) {
                  console.log('[ANALYZE-OLLAMA] Stream complete, total chunks:', chunkCount);
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
          
          console.log('[ANALYZE-OLLAMA] Total chunks received:', chunkCount);
          rawResponse = fullContent;
          finalData = robustJsonParse(fullContent);
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        } else {
          // OpenAI with streaming
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
        
        // Check for connection errors (Ollama not running) or timeout
        const errorMessage = error.message || '';
        if (errorMessage.includes('ECONNREFUSED') || 
            errorMessage.includes('fetch failed') ||
            errorMessage.includes('network') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('net::ERR_CONNECTION_REFUSED') ||
            errorMessage.includes('abort')) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Ollama não está conectado. Verifique se o Ollama está rodando (execute "ollama serve" no terminal).' })}\n\n`));
          controller.close();
          return;
        }
        
        if (error instanceof ZodError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Validation error', details: error.issues })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\n`));
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
