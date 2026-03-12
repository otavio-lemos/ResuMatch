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
    
    const authSettings: AIAuthSettings = aiSettings || {};
    if (!authSettings.provider && !authSettings.apiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No provider or API key specified' }, { status: 400 });
    }

    let aiConfig;
    try {
      aiConfig = await getAIClient(authSettings);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const basePrompt = jobDescription
      ? `JOB DESCRIPTION: ${jobDescription}\n\nRESUME DATA (JSON): ${JSON.stringify(resumeData)}`
      : `RESUME DATA (JSON): ${JSON.stringify(resumeData)}`;

    const userInstructions = atsPrompt ? `USER SPECIFIC RULES: ${atsPrompt}\n\n` : '';
    const finalPrompt = `${userInstructions}${basePrompt}`;

    let finalData: any;

    if (aiConfig.type === 'gemini') {
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
        return NextResponse.json({ error: errorText }, { status: 500 });
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
      
      finalData = robustJsonParse(fullText);

    } else {
      const stream = await aiConfig.client.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: getAtsAnalyzerSkill(language) },
          { role: 'user', content: finalPrompt }
        ],
        temperature: aiConfig.temperature,
        stream: false,
      });

      const content = stream.choices[0]?.message?.content || '';
      finalData = robustJsonParse(content);
    }

    return NextResponse.json({ data: finalData });

  } catch (error: any) {
    console.error("Error in analyze:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
