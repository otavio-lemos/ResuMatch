# LangChain Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Replace manual LLM calls with LangChain for structured JSON output, unified streaming, and robust error handling.

**Architecture:** 
- New `lib/ai/` layer with LangChain
- Keep existing skills in `.agent/skills/` but load as prompts
- Output parsers with Zod for structured JSON
- Single streaming implementation for all providers

**Tech Stack:** LangChain (@langchain/core, langchain-openai, langchain-google-genai), Zod

---

## Chunk 1: Setup & Client Factory

**Files:**
- Modify: `package.json`
- Create: `lib/ai/client.ts`
- Create: `lib/ai/types.ts`

- [ ] **Step 1: Add LangChain dependencies**

```bash
npm install langchain @langchain/core @langchain/openai @langchain/google-genai zod
```

- [ ] **Step 2: Create `lib/ai/types.ts`**

```typescript
import { z } from 'zod';

export const ResumeDataSchema = z.object({
  personalInfo: z.object({
    fullName: z.string(),
    title: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    github: z.string().optional(),
    portfolio: z.string()
  }),
  summary: z.string(),
  experiences: z.array(z.object({
    id: z.string(),
    company: z.string(),
    position: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    current: z.boolean(),
    description: z.array(z.string())
  })),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string(),
    degree: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    current: z.boolean(),
    description: z.string()
  })),
  skills: z.array(z.object({
    id: z.string(),
    category: z.string(),
    skills: z.array(z.string())
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    expirationDate: z.string()
  })),
  projects: z.array(z.any()),
  languages: z.array(z.object({
    id: z.string(),
    language: z.string(),
    proficiency: z.string()
  })),
  volunteer: z.array(z.any()),
  _sectionHeaders: z.record(z.string()).optional()
});

export const ATSAnalysisSchema = z.object({
  scores: z.object({
    design: z.number().min(0).max(100),
    estrutura: z.number().min(0).max(100),
    conteudo: z.number().min(0).max(100)
  }),
  designChecks: z.array(z.object({
    label: z.string(),
    passed: z.boolean(),
    feedback: z.string()
  })),
  structureChecks: z.array(z.object({
    label: z.string(),
    passed: z.boolean(),
    feedback: z.string()
  })),
  conteudoMetrics: z.object({
    wordCount: z.object({ value: z.number(), target: z.string(), status: z.string() }),
    starBullets: z.object({ value: z.number(), target: z.string(), status: z.string() }),
    keywordCount: z.object({ value: z.number(), target: z.string(), status: z.string() })
  }),
  jdMatch: z.object({
    score: z.number().min(0).max(100),
    matchedKeywords: z.array(z.string()),
    missingKeywords: z.array(z.string())
  }).optional(),
  detailedSuggestions: z.array(z.object({
    section: z.string(),
    type: z.string(),
    label: z.string(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  }))
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type ATSAnalysis = z.infer<typeof ATSAnalysisSchema>;

export type AIProvider = 'gemini' | 'openai' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  baseURL?: string;
}
```

- [ ] **Step 3: Create `lib/ai/client.ts`**

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AISettings } from '@/store/useAISettingsStore';
import { AIConfig, AIProvider } from './types';

export function getChatModel(settings: AISettings): ChatOpenAI | ChatGoogleGenerativeAI {
  const { provider, apiKey, baseUrl, model, temperature, maxTokens } = settings;
  
  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: model || 'gemini-2.0-flash',
      apiKey: apiKey || process.env.GEMINI_API_KEY || '',
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 2048,
    });
  }
  
  // OpenAI or Ollama (OpenAI-compatible)
  const baseURL = baseUrl || (provider === 'ollama' 
    ? (process.env.DOCKER_CONTAINER === 'true' 
        ? 'http://host.docker.internal:11434/v1' 
        : 'http://localhost:11434/v1')
    : 'https://api.openai.com/v1');
  
  return new ChatOpenAI({
    model: model || (provider === 'ollama' ? 'qwen3:8b' : 'gpt-4o-mini'),
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 2048,
    apiKey: apiKey || (provider === 'ollama' ? 'ollama' : ''),
    baseURL,
    streaming: true,
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
```

- [ ] **Step 4: Commit**

```bash
git add package.json lib/ai/types.ts lib/ai/client.ts
git commit -m "feat(ai): add LangChain setup with client factory"
```

---

## Chunk 2: Output Parsers

**Files:**
- Create: `lib/ai/parsers.ts`

- [ ] **Step 1: Create `lib/ai/parsers.ts`**

```typescript
import { OutputParserException, StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { ResumeDataSchema, ATSAnalysisSchema, ResumeData, ATSAnalysis } from './types';

export const resumeParser = StructuredOutputParser.fromZodSchema(ResumeDataSchema);
export const atsParser = StructuredOutputParser.fromZodSchema(ATSAnalysisSchema);

export function parseResume(raw: string): ResumeData {
  try {
    const parsed = JSON.parse(raw);
    return ResumeDataSchema.parse(parsed);
  } catch (e) {
    throw new OutputParserException(
      `Failed to parse resume: ${e instanceof Error ? e.message : 'Unknown error'}`,
      raw
    );
  }
}

export function parseATSAnalysis(raw: string): ATSAnalysis {
  try {
    const parsed = JSON.parse(raw);
    // Handle field name variations (estrutura vs structure)
    if (parsed.scores?.structure && !parsed.scores.estrutura) {
      parsed.scores.estrutura = parsed.scores.structure;
    }
    return ATSAnalysisSchema.parse(parsed);
  } catch (e) {
    throw new OutputParserException(
      `Failed to parse ATS analysis: ${e instanceof Error ? e.message : 'Unknown error'}`,
      raw
    );
  }
}

export function getResumeParserInstructions(): string {
  return resumeParser.getFormatInstructions();
}

export function getATSParserInstructions(): string {
  return atsParser.getFormatInstructions();
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/parsers.ts
git commit -m "feat(ai): add output parsers for structured JSON"
```

---

## Chunk 3: Prompt Templates

**Files:**
- Create: `lib/ai/prompts/parser.ts`
- Create: `lib/ai/prompts/analyzer.ts`
- Create: `lib/ai/prompts/rewrite.ts`
- Modify: `lib/get-skill.ts` (add skill loader)

- [ ] **Step 1: Create `lib/ai/prompts/parser.ts`**

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsParserSkill } from '@/lib/get-skill';

export function createParserPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsParserSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

IMPORTANT: You MUST use the exact section names from the document in _sectionHeaders.
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

Now parse this resume content:

{resumeContent}

{formatInstructions}
  `);
  
  return template;
}
```

- [ ] **Step 2: Create `lib/ai/prompts/analyzer.ts`**

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsAnalyzerSkill } from '@/lib/get-skill';

export function createAnalyzerPrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsAnalyzerSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

Current year for calculations: 2026
Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

{jobDescription ? `JOB DESCRIPTION:\n${jobDescription}\n` : ''}
RESUME DATA (JSON):
{resumeData}

{formatInstructions}
  `);
  
  return template;
}
```

- [ ] **Step 3: Create `lib/ai/prompts/rewrite.ts`**

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { getAtsRewriteSkill } from '@/lib/get-skill';

export function createRewritePrompt(language: 'pt' | 'en' = 'pt') {
  const skill = getAtsRewriteSkill(language);
  
  const template = PromptTemplate.fromTemplate(`
${skill}

Language: ${language === 'pt' ? 'Portuguese (Brazilian)' : 'English'}

Rewrite this content:

{bulletContent}

Output only the rewritten bullets, one per line.
  `);
  
  return template;
}
```

- [ ] **Step 4: Create `lib/ai/prompts/index.ts`**

```typescript
export { createParserPrompt } from './parser';
export { createAnalyzerPrompt } from './analyzer';
export { createRewritePrompt } from './rewrite';
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/prompts/
git commit -m "feat(ai): add prompt templates using existing skills"
```

---

## Chunk 4: Chains (Core Logic)

**Files:**
- Create: `lib/ai/chains/parse-resume.ts`
- Create: `lib/ai/chains/analyze-ats.ts`
- Create: `lib/ai/chains/rewrite-bullets.ts`
- Create: `lib/ai/chains/index.ts`

- [ ] **Step 1: Create `lib/ai/chains/parse-resume.ts`**

```typescript
import { getChatModel, streamAI } from '../client';
import { createParserPrompt } from '../prompts';
import { parseResume, getResumeParserInstructions } from '../parsers';
import { AISettings } from '@/store/useAISettingsStore';

export interface ParseResumeInput {
  resumeContent: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* parseResumeChain(input: ParseResumeInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeContent, language, aiSettings } = input;
  
  try {
    const model = getChatModel(aiSettings);
    const prompt = await createParserPrompt(language);
    const formatInstructions = getResumeParserInstructions();
    
    const formatted = await prompt.format({
      resumeContent,
      formatInstructions
    });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    const parsed = parseResume(fullContent);
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}
```

- [ ] **Step 2: Create `lib/ai/chains/analyze-ats.ts`**

```typescript
import { getChatModel, streamAI } from '../client';
import { createAnalyzerPrompt } from '../prompts';
import { parseATSAnalysis, getATSParserInstructions } from '../parsers';
import { AISettings } from '@/store/useAISettingsStore';

export interface AnalyzeATSInput {
  resumeData: any;
  jobDescription?: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* analyzeATSChain(input: AnalyzeATSInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: any; error?: string }> {
  const { resumeData, jobDescription, language, aiSettings } = input;
  
  try {
    const model = getChatModel(aiSettings);
    const prompt = await createAnalyzerPrompt(language);
    const formatInstructions = getATSParserInstructions();
    
    const formatted = await prompt.format({
      resumeData: JSON.stringify(resumeData, null, 2),
      jobDescription: jobDescription || '',
      formatInstructions
    });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    const parsed = parseATSAnalysis(fullContent);
    yield { type: 'done', data: parsed };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}
```

- [ ] **Step 3: Create `lib/ai/chains/rewrite-bullets.ts`**

```typescript
import { getChatModel, streamAI } from '../client';
import { createRewritePrompt } from '../prompts';
import { AISettings } from '@/store/useAISettingsStore';

export interface RewriteBulletsInput {
  bulletContent: string;
  language: 'pt' | 'en';
  aiSettings: AISettings;
}

export async function* rewriteBulletsChain(input: RewriteBulletsInput): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; data?: string; error?: string }> {
  const { bulletContent, language, aiSettings } = input;
  
  try {
    const model = getChatModel(aiSettings);
    const prompt = await createRewritePrompt(language);
    
    const formatted = await prompt.format({ bulletContent });
    
    let fullContent = '';
    
    for await (const chunk of streamAI(model, [
      { role: 'user', content: formatted }
    ])) {
      fullContent += chunk;
      yield { type: 'chunk', content: chunk };
    }
    
    yield { type: 'done', data: fullContent };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}
```

- [ ] **Step 4: Create `lib/ai/chains/index.ts`**

```typescript
export { parseResumeChain } from './parse-resume';
export { analyzeATSChain } from './analyze-ats';
export { rewriteBulletsChain } from './rewrite-bullets';
export type { ParseResumeInput } from './parse-resume';
export type { AnalyzeATSInput } from './analyze-ats';
export type { RewriteBulletsInput } from './rewrite-bullets';
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/chains/
git commit -m "feat(ai): add LangChain chains for resume parsing and ATS analysis"
```

---

## Chunk 5: API Route Integration

**Files:**
- Modify: `app/api/parse-resume/route.ts` (add LangChain fallback)
- Modify: `app/api/analyze/route.ts` (add LangChain fallback)

- [ ] **Step 1: Add LangChain integration to `parse-resume/route.ts`**

Add a toggle or environment variable to switch between old and new implementation:

```typescript
// At top of file
import { parseResumeChain } from '@/lib/ai/chains';

// In POST handler, replace LLM call section with:
const USE_LANGCHAIN = process.env.USE_LANGCHAIN === 'true';

if (USE_LANGCHAIN) {
  const generator = parseResumeChain({
    resumeContent: pdfTextContent,
    language: currentLanguage as 'pt' | 'en',
    aiSettings: authSettings as AISettings
  });
  
  for await (const result of generator) {
    if (result.type === 'chunk') {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: result.content })}\n\n`));
    } else if (result.type === 'done') {
      finalData = result.data;
    } else if (result.type === 'error') {
      throw new Error(result.error);
    }
  }
} else {
  // Keep existing implementation
}
```

- [ ] **Step 2: Add LangChain integration to `analyze/route.ts`**

Same pattern as above.

- [ ] **Step 3: Add environment variable**

Add to `.env.local`:
```
USE_LANGCHAIN=false
```

- [ ] **Step 4: Commit**

```bash
git add app/api/parse-resume/route.ts app/api/analyze/route.ts
git commit -m "feat(api): add LangChain integration to parse-resume and analyze routes"
```

---

## Chunk 6: Testing

**Files:**
- Create: `__tests__/lib/ai/parsers.test.ts`
- Create: `__tests__/lib/ai/chains.test.ts`

- [ ] **Step 1: Test parsers**

```typescript
import { parseResume, parseATSAnalysis } from '@/lib/ai/parsers';

describe('Resume Parser', () => {
  it('parses valid resume JSON', () => {
    const validResume = {
      personalInfo: { fullName: 'John', title: 'Dev', email: 'john@test.com', phone: '123', location: 'NYC', linkedin: 'linkedin.com/in/john', github: '', portfolio: '' },
      summary: 'Summary',
      experiences: [{ id: '1', company: 'Acme', position: 'Dev', location: 'NYC', startDate: '01/2020', endDate: '12/2024', current: false, description: ['Built things'] }],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      languages: [],
      volunteer: []
    };
    
    const result = parseResume(JSON.stringify(validResume));
    expect(result.personalInfo.fullName).toBe('John');
  });
  
  it('throws on invalid JSON', () => {
    expect(() => parseResume('not json')).toThrow();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add __tests__/lib/ai/
git commit -m "test(ai): add tests for parsers"
```

---

## Summary

| Chunk | Description | Complexity |
|-------|-------------|------------|
| 1 | Setup LangChain + Client Factory | Medium |
| 2 | Zod Output Parsers | Low |
| 3 | Prompt Templates (reuse existing skills) | Low |
| 4 | Chain implementations | Medium |
| 5 | API Route integration | Medium |
| 6 | Tests | Low |

**Migration Strategy:**
1. Deploy behind feature flag (`USE_LANGCHAIN=false`)
2. A/B test with small traffic
3. Gradually increase traffic
4. Remove old implementation after validation
