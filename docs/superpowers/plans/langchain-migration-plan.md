# PLANO DETALHADO - MIGRAÇÃO LANGCHAIN

---

## 1. BACKUP

**Comando:**
```bash
git checkout -b backup/pre-langchain-20260314 && git add . && git commit -m "backup: pre-langchain"
```

---

## 2. INSTALAR DEPENDÊNCIAS

**Arquivo:** `package.json`

**Adicionar em dependencies (linhas 15-43):**
```json
"langchain": "^0.3.0",
"@langchain/core": "^0.3.0", 
"@langchain/openai": "^0.3.0",
"@langchain/google-genai": "^0.3.0"
```

**Comando:**
```bash
npm install
```

---

## 3. CRIAR ARQUIVOS

### ARQUIVO 1: `lib/langchain/client.ts` (NOVO - 90 linhas)

**Estrutura completa:**
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { JsonOutputParser } from '@langchain/core/output_parsers';

export type ProviderType = 'gemini' | 'openai' | 'ollama';

export interface LangChainConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export class LangChainClient {
  private client: ChatOpenAI | ChatGoogleGenerativeAI;
  private config: LangChainConfig;
  private outputParser: StringOutputParser;
  private jsonParser: JsonOutputParser;

  constructor(config: LangChainConfig) {
    this.config = config;
    this.outputParser = new StringOutputParser();
    this.jsonParser = new JsonOutputParser();

    if (config.provider === 'gemini') {
      this.client = new ChatGoogleGenerativeAI({
        model: config.model || 'gemini-2.0-flash',
        temperature: config.temperature ?? 0.1,
        maxOutputTokens: config.maxTokens ?? 16384,
        apiKey: config.apiKey,
      });
    } else {
      this.client = new ChatOpenAI({
        model: config.model || (config.provider === 'ollama' ? 'qwen2.5:7b' : 'gpt-4o-mini'),
        temperature: config.temperature ?? 0.1,
        maxTokens: config.maxTokens ?? 4096,
        apiKey: config.apiKey || (config.provider === 'ollama' ? 'ollama' : undefined),
        baseURL: config.baseUrl,
      });
    }
  }

  async invoke(prompt: string, systemInstruction?: string, format: 'text' | 'json' = 'text'): Promise<string> {
    const messages = [];
    if (systemInstruction) messages.push(new SystemMessage(systemInstruction));
    messages.push(new HumanMessage(prompt));

    const parser = format === 'json' ? this.jsonParser : this.outputParser;
    const chain = this.client.pipe(parser);
    const result = await chain.invoke(messages);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  async *stream(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const messages = [];
    if (systemInstruction) messages.push(new SystemMessage(systemInstruction));
    messages.push(new HumanMessage(prompt));

    const chain = this.client.pipe(this.outputParser);
    for await (const chunk of await chain.stream(messages)) {
      yield chunk;
    }
  }

  async invokeJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    const messages = [];
    if (systemInstruction) messages.push(new SystemMessage(systemInstruction));
    messages.push(new HumanMessage(prompt));

    const chain = this.client.pipe(this.jsonParser);
    return await chain.invoke(messages) as T;
  }
}

export function createLangChainClient(config: LangChainConfig): LangChainClient {
  return new LangChainClient(config);
}
```

### ARQUIVO 2: `lib/langchain/index.ts` (NOVO - 3 linhas)

```typescript
export { LangChainClient, createLangChainClient } from './client';
export type { LangChainConfig, ProviderType } from './client';
```

---

## 4. MODIFICAR ARQUIVOS

### ARQUIVO 3: `app/actions/ai.ts`

| Parte | Linha Atual | O que fazer | Código Novo |
|-------|-------------|-------------|-------------|
| Imports | +1-10 | ADICIONAR | `import { createLangChainClient, LangChainClient } from '@/lib/langchain';` |
| Função NOVA | After linha 18 | ADICIONAR | `export async function getLangChainClient(authSettings?: AIAuthSettings): Promise<LangChainClient> { const provider = authSettings?.provider \|\| 'gemini'; const config = { provider, apiKey: authSettings?.apiKey \|\| process.env.GEMINI_API_KEY, model: authSettings?.model \|\| (provider === 'ollama' ? 'qwen2.5:7b' : 'gemini-2.0-flash'), temperature: authSettings?.temperature ?? 0.1, maxTokens: authSettings?.maxTokens, baseUrl: authSettings?.baseUrl }; return createLangChainClient(config); }` |
| callAI | 66-129 | SUBSTITUIR | `export async function callAI(prompt: string, client: LangChainClient, systemInstruction: string, responseFormat?: 'json_object'): Promise<{ prompt: string; response: string; debug: any }> { try { const format = responseFormat === 'json_object' ? 'json' : 'text'; const response = await client.invoke(prompt, systemInstruction, format); return { prompt, response, debug: { skill: systemInstruction, userPrompt: prompt, rawResponse: response } }; } catch (error: any) { logger.error('AI Call failed', error); throw error; } }` |
| generateATSAnalysis | 162-170 | ALTERAR | `const client = await getLangChainClient(authSettings); const response = await client.invokeJSON(finalPrompt, getAtsAnalyzerSkill(language)); return { prompt: finalPrompt, response };` |
| translateResumeData | 172-178 | ALTERAR | Similar - usar client.invokeJSON |
| parseResumeFromText | 180-187 | ALTERAR | Similar - usar client.invokeJSON |
| parseResumeFromPDF | 189-216 | ALTERAR | Similar - usar client.invokeJSON |

---

### ARQUIVO 4: `app/api/analyze/route.ts`

| Parte | Linha | O que fazer | Código Novo |
|-------|-------|-------------|-------------|
| Imports | +5 | ADICIONAR | `import { getLangChainClient } from '@/app/actions/ai';` |
| get client | 48-56 | SUBSTITUIR | `const client = await getLangChainClient(authSettings);` |
| Bloco Gemini | 76-95 | REMOVER | Todo o bloco if (aiConfig.type === 'gemini') |
| Bloco Ollama | 123-148 | SUBSTITUIR | `let fullContent = ''; for await (const chunk of client.stream(userPrompt, skillUsed)) { fullContent += chunk; controller.enqueue(encoder.encode(\`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n\`)); } finalData = JSON.parse(fullContent);` |
| Parse JSON | 121, 147 | REMOVER | linhas `finalData = robustJsonParse(fullText/fullContent)` |

---

### ARQUIVO 5: `app/api/parse-resume/route.ts`

| Parte | Linha | O que fazer |
|-------|-------|-------------|
| Imports | +5 | ADICIONAR import getLangChainClient |
| get client | ~100 | SUBSTITUIR getAIClient por getLangChainClient |
| Bloco AI | ~200-280 | USAR client.stream() |
| Parse JSON | 253, 280 | REMOVER robustJsonParse |

---

## 5. VALIDAR

```bash
npm run build
```

---

## RESUMO EXECUTÁVEL

```bash
# 1. Backup
git checkout -b backup/pre-langchain-20260314 && git add . && git commit -m "backup: pre-langchain"

# 2. Instalar
npm install langchain @langchain/core @langchain/openai @langchain/google-genai

# 3. Criar arquivos
# - lib/langchain/client.ts (90 linhas)
# - lib/langchain/index.ts (3 linhas)

# 4. Modificar
# - app/actions/ai.ts
# - app/api/analyze/route.ts  
# - app/api/parse-resume/route.ts

# 5. Testar
npm run build
```
