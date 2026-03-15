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
  
  return new ChatOpenAI({
    model: model || (provider === 'ollama' ? 'qwen3:8b' : 'gpt-4o-mini'),
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
  const stream = await model.stream(messages);
  
  for await (const chunk of stream) {
    const content = chunk.content;
    if (typeof content === 'string') {
      yield content;
    }
  }
}
