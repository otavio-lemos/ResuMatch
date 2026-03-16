import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AISettings } from '@/store/useAISettingsStore';

export function getChatModel(settings: AISettings): ChatOpenAI | ChatGoogleGenerativeAI {
  const { provider, apiKey, baseUrl, model, temperature, maxTokens, topP, topK } = settings;
  
  console.log('[getChatModel] ========== LANGCHAIN MODEL CONFIG ==========');
  console.log('[getChatModel] Input - provider:', provider);
  console.log('[getChatModel] Input - model:', model);
  console.log('[getChatModel] Input - apiKey:', apiKey ? '***' + apiKey.slice(-4) : 'not set');
  console.log('[getChatModel] Input - baseUrl:', baseUrl);
  console.log('[getChatModel] Input - temperature:', temperature);
  console.log('[getChatModel] Input - topP:', topP);
  console.log('[getChatModel] Input - topK:', topK);
  console.log('[getChatModel] Input - maxTokens:', maxTokens);
  console.log('[getChatModel] =============================================');
  
  if (provider === 'gemini') {
    console.log('[getChatModel] Creating ChatGoogleGenerativeAI with maxOutputTokens:', maxTokens ?? 2048);
    return new ChatGoogleGenerativeAI({
      model: model || 'gemini-2.0-flash',
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 2048,
      topP: topP ?? 0.9,
      topK: topK ?? 40,
    });
  }
  
  const resolvedBaseURL = baseUrl || (provider === 'ollama' 
    ? (process.env.DOCKER_CONTAINER === 'true' 
        ? 'http://host.docker.internal:11434/v1' 
        : 'http://localhost:11434/v1')
    : 'https://api.openai.com/v1');
  
  const resolvedApiKey = apiKey || (provider === 'ollama' ? 'ollama' : undefined);
  
  const isOllama = provider === 'ollama';
  
  console.log('[getChatModel] Creating ChatOpenAI with maxTokens:', maxTokens ?? 8192, 'baseURL:', resolvedBaseURL);
  return new ChatOpenAI({
    model: model || (isOllama ? 'qwen3:8b' : 'gpt-4o-mini'),
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 8192,
    topP: topP ?? 0.9,
    apiKey: resolvedApiKey,
    configuration: {
      baseURL: resolvedBaseURL,
    },
  });
}

export async function* streamAI(
  model: ChatOpenAI | ChatGoogleGenerativeAI,
  messages: { role: 'system' | 'user'; content: string }[]
): AsyncGenerator<string> {
  console.log('[streamAI] Calling model.stream()...');
  const stream = await model.stream(messages);
  console.log('[streamAI] Got stream, type:', typeof stream);
  
  let chunkCount = 0;
  let lastContentLength = 0;
  let emptyChunkStreak = 0;
  
  for await (const chunk of stream) {
    chunkCount++;
    let content: string | undefined = chunk.content as string;
    
    // Gemini function call format: content might be in kwargs.json
    const chunkAny = chunk as unknown as { kwargs?: { json?: unknown } };
    if ((!content || content.length === 0) && chunkAny.kwargs?.json) {
      const jsonVal = chunkAny.kwargs.json;
      content = typeof jsonVal === 'string' ? JSON.parse(jsonVal) : JSON.stringify(jsonVal);
    }
    
    // Debug: log first few chunks - show full chunk structure
    if (chunkCount <= 3) {
      console.log('[streamAI] Chunk', chunkCount, 'FULL:', JSON.stringify(chunk).slice(0, 300));
      console.log('[streamAI] Chunk content:', content, 'type:', typeof content);
    }
    
    if (typeof content === 'string' && content.length > 0) {
      emptyChunkStreak = 0;
      lastContentLength += content.length;
      yield content;
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'text' && part.text) {
          emptyChunkStreak = 0;
          lastContentLength += (part.text as string).length;
          yield part.text as string;
        }
      }
    } else {
      emptyChunkStreak++;
      // If we get too many empty chunks in a row, assume stream is done
      if (emptyChunkStreak > 100 && lastContentLength > 100) {
        console.log('[streamAI] Empty chunk streak:', emptyChunkStreak, 'forcing end');
        break;
      }
    }
    
    // Safety limit for very long streams
    if (chunkCount > 100000) {
      console.log('[streamAI] Safety: forcing end after', chunkCount, 'chunks');
      break;
    }
  }
  console.log('[streamAI] Total chunks:', chunkCount, 'content length:', lastContentLength);
  
  // Fallback for Ollama: if streaming returned empty chunks, use invoke instead
  if (lastContentLength === 0 && chunkCount > 0) {
    console.log('[streamAI] Detected empty streaming, falling back to model.invoke()...');
    try {
      const response = await model.invoke(messages);
      const invokeContent = typeof response.content === 'string' 
        ? response.content 
        : String(response.content || '');
      console.log('[streamAI] Invoke returned content length:', invokeContent.length);
      if (invokeContent.length > 0) {
        yield invokeContent;
      }
    } catch (invokeError) {
      console.error('[streamAI] Invoke fallback failed:', invokeError);
    }
  }
}
