import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z, ZodError } from 'zod';

const testAiSchema = z.object({
  baseUrl: z.string().url('Invalid URL'),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().optional(),
  provider: z.string().optional(),
  timeout: z.number().optional(),
  language: z.string().optional()
});

export async function POST(request: NextRequest) {
  let settings: any;
  try {
    settings = await request.json();
    const lang = settings?.language || 'pt';
    const isEn = lang === 'en';
    
    const t = {
      validationFailed: isEn ? 'Validation failed' : 'Validação falhou',
      baseUrlRequired: isEn ? 'Base URL and model are required' : 'URL base e modelo são obrigatórios',
      successMessage: isEn ? '✅ Connection OK! Response:' : '✅ Conexão OK! Resposta:',
      errorPrefix: isEn ? '❌ Error' : '❌ Erro',
      rateLimit: isEn 
        ? '❌ Rate limit exceeded (Error 429). The free Gemini service has a per-minute limit. Please wait a moment and try again.' 
        : '❌ Rate limit excedido (Erro 429). O serviço gratuito do Gemini tem limite por minuto. Aguarde e tente novamente.',
      unknownError: isEn ? 'Unknown error' : 'Erro desconhecido',
      dnsError: isEn ? '❌ DNS could not resolve the address' : '❌ DNS não conseguiu resolver o endereço',
      dnsDetails: isEn ? 'The server likely has no internet access or the domain is wrong.' : 'O K8s provavelmente não tem acesso à internet ou o domínio está errado.',
      connRefused: isEn ? '❌ Connection refused' : '❌ Conexão recusada',
      connRefusedDetails: isEn ? 'The server is not accepting connections on the specified port.' : 'O servidor não está aceitando conexões na porta especificada.',
      timeoutError: isEn ? '⏱ Timeout exceeded' : '⏱ Tempo limite excedido',
      timeoutDetails: isEn ? 'The server took too long to respond. Try increasing the timeout.' : 'O servidor demorou demais para responder. Tente aumentar o timeout.',
      genericError: isEn ? '❌ Error:' : '❌ Erro:',
    };
    
    try {
      testAiSchema.parse(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, message: t.validationFailed, details: error.issues },
          { status: 400 }
        );
      }
    }

    if (!settings.baseUrl || !settings.model) {
      return NextResponse.json(
        { success: false, message: t.baseUrlRequired },
        { status: 400 }
      );
    }

    const isGemini = settings.provider === 'gemini' || settings.baseUrl.includes('generativelanguage.googleapis.com');
    
    let response;
    
    if (isGemini && settings.apiKey) {
      const url = `${settings.baseUrl.replace('/v1beta/openai/', '/v1beta/')}models/${settings.model}:generateContent`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': settings.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with "OK"' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        }),
        signal: AbortSignal.timeout(settings.timeout || 120000),
      });
    } else {
      const client = new OpenAI({
        baseURL: settings.baseUrl,
        apiKey: settings.apiKey || 'not-needed',
        timeout: settings.timeout || 120000,
      });

      const openaiResponse = await client.chat.completions.create({
        model: settings.model,
        messages: [{ role: 'user', content: 'Reply with "OK"' }],
        temperature: 0.1,
        max_tokens: 10,
      });

      return NextResponse.json({
        success: true,
        message: `${t.successMessage} "${openaiResponse.choices[0]?.message?.content || 'N/A'}"`,
      });
    }

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return NextResponse.json({
        success: true,
        message: text ? `${t.successMessage} "${text}"` : `${t.successMessage} (response: ${JSON.stringify(data).substring(0, 100)})`,
      });
    }

    const errorText = await response.text();
    
    return NextResponse.json(
      { success: false, message: `${t.errorPrefix} ${response.status}: ${errorText.substring(0, 200)}` },
      { status: response.status }
    );
  } catch (error: any) {
    console.error('AI Test Error:', error);
    
    // settings is already available from the outer scope if it succeeded reading initially
    const lang = (typeof settings !== 'undefined' && settings?.language) || 'pt';
    const isEn = lang === 'en';
    
    const t = {
      unknownError: isEn ? 'Unknown error' : 'Erro desconhecido',
      dnsError: isEn ? '❌ DNS could not resolve the address' : '❌ DNS não conseguiu resolver o endereço',
      dnsDetails: isEn ? 'The server likely has no internet access or the domain is wrong.' : 'O K8s provavelmente não tem acesso à internet ou o domínio está errado.',
      connRefused: isEn ? '❌ Connection refused' : '❌ Conexão recusada',
      connRefusedDetails: isEn ? 'The server is not accepting connections on the specified port.' : 'O servidor não está aceitando conexões na porta especificada.',
      timeoutError: isEn ? '⏱ Timeout exceeded' : '⏱ Tempo limite excedido',
      timeoutDetails: isEn ? 'The server took too long to respond. Try increasing the timeout.' : 'O servidor demorou demais para responder. Tente aumentar o timeout.',
      genericError: isEn ? '❌ Error:' : '❌ Erro:',
    };
    
    let errorMessage = t.unknownError;
    let errorDetails = '';
    
    const errorStr = JSON.stringify(error);
    
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND') || errorStr.includes('ENOTFOUND')) {
      errorMessage = t.dnsError;
      errorDetails = t.dnsDetails;
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || errorStr.includes('ECONNREFUSED')) {
      errorMessage = t.connRefused;
      errorDetails = t.connRefusedDetails;
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout') || errorStr.includes('timeout')) {
      errorMessage = t.timeoutError;
      errorDetails = t.timeoutDetails;
    } else if (error.message) {
      errorMessage = `${t.genericError} ${error.message}`;
      errorDetails = errorStr.length < 500 ? errorStr : '';
    }

    return NextResponse.json(
      { success: false, message: errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage },
      { status: 500 }
    );
  }
}
