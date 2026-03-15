import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AISettings } from '@/store/useAISettingsStore';

export function getChatModel(settings: AISettings): ChatOpenAI | ChatGoogleGenerativeAI {
  const { provider, apiKey, baseUrl, model, temperature, maxTokens, topP, topK } = settings;
  
  if (provider === 'gemini') {
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
  
  return new ChatOpenAI({
    model: model || (isOllama ? 'qwen3:8b' : 'gpt-4o-mini'),
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 2048,
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
    const content = chunk.content;
    
    // Debug: log first few chunks
    if (chunkCount <= 5) {
      console.log('[streamAI] Chunk', chunkCount, ':', JSON.stringify(chunk).slice(0, 150));
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
}
