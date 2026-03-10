import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();

    if (!settings.baseUrl || !settings.model) {
      return NextResponse.json(
        { success: false, message: 'URL base e modelo são obrigatórios' },
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
        message: `✅ Conexão OK! Resposta: "${openaiResponse.choices[0].message.content}"`,
      });
    }

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return NextResponse.json({
        success: true,
        message: text ? `✅ Conexão OK! Resposta: "${text}"` : `✅ Conexão OK! (response: ${JSON.stringify(data).substring(0, 100)})`,
      });
    }

    const errorText = await response.text();
    
    if (response.status === 429) {
      return NextResponse.json(
        { 
          success: false, 
          message: `❌ Rate limit exceeded (Error 429). The free Gemini service has a per-minute limit. Please wait a moment and try again.` 
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: `❌ Erro ${response.status}: ${errorText.substring(0, 200)}` 
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('AI Test Error:', error);
    
    let errorMessage = 'Erro desconhecido';
    let errorDetails = '';
    
    const errorStr = JSON.stringify(error);
    
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND') || errorStr.includes('ENOTFOUND')) {
      errorMessage = '❌ DNS não conseguiu resolver o endereço';
      errorDetails = 'O K8s provavelmente não tem acesso à internet ou o domínio está errado.';
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || errorStr.includes('ECONNREFUSED')) {
      errorMessage = '❌ Conexão recusada';
      errorDetails = 'O servidor não está aceitando conexões na porta especificada.';
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout') || errorStr.includes('timeout')) {
      errorMessage = '⏱ Tempo limite excedido';
      errorDetails = 'O servidor demorou demais para responder. Tente aumentar o timeout.';
    } else if (error.message) {
      errorMessage = '❌ Erro: ' + error.message;
      errorDetails = errorStr.length < 500 ? errorStr : '';
    }

    return NextResponse.json(
      { 
        success: false, 
        message: errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage,
        error: errorStr.substring(0, 1000)
      },
      { status: 500 }
    );
  }
}
