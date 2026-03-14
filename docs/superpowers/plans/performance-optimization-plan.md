# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitigar problemas de timeout no sistema ATS ResuMatch causados por prompts massivos enviados para IA

// annotation made by Requirements Auditor: ℹ️ Info Goal adjusted to match actual bottleneck: prompt size, not file size. This is the core requirement to address.

// annotation made by Assumptions Auditor: ℹ️ Info User confirmed: gargalo = tamanho do prompt. Original assumption (file size) corrected.

**Architecture:** Otimização incremental com chunking de prompt, mantendo compatibilidade com Next.js existente

**Tech Stack:** Next.js 15 (App Router), TypeScript, streaming APIs

// annotation made by YAGNI Auditor: ℹ️ Info Corrected to Next.js (matches actual codebase)

// annotation made by Requirements Auditor: ℹ️ Info Tech stack corrected to match codebase (Next.js 15, not Express)

---

## Contexto do Problema

O sistema atual processa currículos inteiros em uma única requisição, causando:
- Timeout com prompts > 10K tokens
- Limite de 16K tokens excedido
- Resposta lenta para currículos extensos

// annotation made by Requirements Auditor: ℹ️ Info Problem context adjusted to focus on prompt size (the actual bottleneck).

// annotation made by Assumptions Auditor: ℹ️ Info User confirmed prompt size is the issue, not file size.

## Estratégia de Mitigação

1. **Chunking de Prompt** - Dividir prompt em partes menores
2. **Processamento Incremental** - Processar seções do currículo separadamente
3. **Streaming de Resposta** - Manter streaming existente para respostas da IA
4. **Testes Locais** - Validação no ambiente do usuário

// annotation made by Requirements Auditor: ℹ️ Info Strategy simplified based on local-use context. Backup and monitoring removed per user feedback.

---

## Implementação em Módulos

### Módulo 1: Chunking de Prompt

**Files:**
- Create: `lib/prompt-chunker.ts`
- Modify: `app/api/parse-resume/route.ts`
- Test: `__tests__/lib/prompt-chunker.test.ts`

// annotation made by Requirements Auditor: ℹ️ Info File paths corrected to Next.js App Router structure (`lib/` and `app/api/`).

- [ ] **Step 1: Criar módulo de chunking de prompt**
```typescript
// lib/prompt-chunker.ts
export interface ChunkOptions {
  maxTokens: number;
  overlap?: number;
}

export class PromptChunker {
  private maxTokens: number;
  private overlap: number;

  constructor(options: ChunkOptions) {
    this.maxTokens = options.maxTokens;
    this.overlap = options.overlap || 100;
  }

  splitIntoChunks(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const word of words) {
      const wordTokens = word.length / 4;
      
      if (currentTokens + wordTokens > this.maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        
        const overlapWords = currentChunk.slice(-this.overlap / 4);
        currentChunk = [...overlapWords, word];
        currentTokens = overlapWords.reduce((sum, w) => sum + w.length / 4, 0) + wordTokens;
      } else {
        currentChunk.push(word);
        currentTokens += wordTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  async processInChunks(text: string, processor: (chunk: string) => Promise<any>): Promise<any[]> {
    const chunks = this.splitIntoChunks(text);
    const results = [];

    for (let i = 0; i < chunks.length; i++) {
      const result = await processor(chunks[i]);
      results.push({ chunkIndex: i, result });
    }

    return results;
  }
}
```

// annotation made by YAGNI Auditor: ℹ️ Info Uses TypeScript (ESM) to match codebase conventions.

// annotation made by Assumptions Auditor: 🟡 Warning Simple word-split chunking may break JSON in prompts. Consider splitting by resume sections (experience, education, skills) instead of arbitrary word boundaries.

- [ ] **Step 2: Testar módulo isolado**
Run: `npm test -- __tests__/lib/prompt-chunker.test.ts`
Expected: PASS

### Módulo 2: Extração de Seções do Currículo

**Files:**
- Modify: `app/api/parse-resume/route.ts`
- Create: `lib/section-extractor.ts`
- Test: `__tests__/lib/section-extractor.test.ts`

// annotation made by Requirements Auditor: ℹ️ Info Instead of character-based chunking, extract semantic sections (experience, education, skills) for better LLM processing.

- [ ] **Step 1: Implementar extrator de seções**
```typescript
// lib/section-extractor.ts
export interface ResumeSection {
  name: string;
  content: string;
}

export function extractSections(text: string): ResumeSection[] {
  const sectionPatterns: Record<string, RegExp> = {
    summary: /(?=(summary|profile|about\s*me|objetivo|resumo))[\s\S]*?(?=\n[A-Z][a-z]+\s*:|$)/i,
    experience: /(?=(experience|employment|work\s*history|experiência|trabalho))[\s\S]*?(?=\n[A-Z][a-z]+\s*:|$)/i,
    education: /(?=(education|academic|formação|formacao))[\s\S]*?(?=\n[A-Z][a-z]+\s*:|$)/i,
    skills: /(?=(skills|competencies|habilidades|competências))[\s\S]*?(?=\n[A-Z][a-z]+\s*:|$)/i,
    certifications: /(?=(certifications|certificados|certificações))[\s\S]*?(?=\n[A-Z][a-z]+\s*:|$)/i,
  };

  const sections: ResumeSection[] = [];

  for (const [name, pattern] of Object.entries(sectionPatterns)) {
    const match = text.match(pattern);
    if (match) {
      sections.push({
        name,
        content: match[0].trim()
      });
    }
  }

  return sections;
}
```

// annotation made by Assumptions Auditor: ℹ️ Info Semantic section extraction is better than character-based chunking since it preserves JSON validity.

- [ ] **Step 2: Integrar no parse-resume**
Modify `app/api/parse-resume/route.ts` to:
1. Extract sections from PDF text first
2. Send each section as separate chunk to LLM
3. Aggregate results

### Módulo 3: Processamento Incremental

**Files:**
- Modify: `app/api/parse-resume/route.ts`
- Test: `__tests__/lib/incremental-processor.test.ts`

- [ ] **Step 1: Implementar processamento incremental**
```typescript
// lib/incremental-processor.ts
import { extractSections, ResumeSection } from './section-extractor';

export interface ProcessingOptions {
  maxSectionTokens: number;
  onProgress?: (progress: number, section: string) => void;
}

export class IncrementalProcessor {
  private options: ProcessingOptions;

  constructor(options: ProcessingOptions) {
    this.options = options;
  }

  async processResume(
    resumeText: string,
    processSection: (section: ResumeSection) => Promise<any>
  ): Promise<any> {
    const sections = extractSections(resumeText);
    const results: Record<string, any> = {};
    const total = sections.length;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      this.options.onProgress?.((i / total) * 100, section.name);
      
      const result = await processSection(section);
      results[section.name] = result;
    }

    this.options.onProgress?.(100, 'complete');
    
    return this.aggregateResults(results);
  }

  private aggregateResults(results: Record<string, any>): any {
    return Object.entries(results).reduce((acc, [section, data]) => {
      return { ...acc, [section]: data };
    }, {});
  }
}
```

- [ ] **Step 2: Testar processamento incremental**
Run: `npm test -- __tests__/lib/incremental-processor.test.ts`
Expected: PASS

---

## Validação e Testes

### Testes Unitários

**Files:**
- Create: `__tests__/lib/prompt-chunker.test.ts`
- Create: `__tests__/lib/section-extractor.test.ts`
- Create: `__tests__/lib/incremental-processor.test.ts`

- [ ] **Testes do prompt chunker**
```typescript
// __tests__/lib/prompt-chunker.test.ts
import { PromptChunker } from '../../lib/prompt-chunker';

describe('PromptChunker', () => {
  test('should split text into chunks', () => {
    const chunker = new PromptChunker({ maxTokens: 100 });
    const text = 'word ' .repeat(50);
    
    const chunks = chunker.splitIntoChunks(text);
    
    expect(chunks.length).toBeGreaterThan(1);
  });

  test('should respect maxTokens limit', () => {
    const chunker = new PromptChunker({ maxTokens: 50, overlap: 0 });
    const text = 'a '.repeat(100);
    
    const chunks = chunker.splitIntoChunks(text);
    
    for (const chunk of chunks) {
      const estimatedTokens = chunk.length / 4;
      expect(estimatedTokens).toBeLessThanOrEqual(55);
    }
  });
});
```

- [ ] **Testes do extrator de seções**
```typescript
// __tests__/lib/section-extractor.test.ts
import { extractSections } from '../../lib/section-extractor';

describe('SectionExtractor', () => {
  test('should extract experience section', () => {
    const text = `
Name: John Doe
Experience: 5 years at Tech Corp
Education: BS in Computer Science
Skills: JavaScript, Python
`;

    const sections = extractSections(text);
    
    expect(sections.find(s => s.name === 'experience')).toBeDefined();
    expect(sections.find(s => s.name === 'skills')).toBeDefined();
  });
});
```

### Teste de Integração

- [ ] **Teste com currículo grande**
```typescript
// __tests__/integration/large-resume.test.ts
import { NextRequest } from 'next/server';

describe('Parse Resume Integration', () => {
  test('should handle large resume without timeout', async () => {
    const largeResume = require('../fixtures/large-resume.json');
    
    const startTime = Date.now();
    
    // Simulate the processing
    const response = await processResume(largeResume);
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(60000);
    expect(response).toBeDefined();
  }, 65000);
});
```

---

## Checklist de Validação

- [ ] Chunking de prompt implementado
- [ ] Testes unitários passando
- [ ] Teste com currículo grande (>10KB texto) passando
- [ ] Timeout resolved para prompts grandes

---

**Plan complete and saved to `docs/superpowers/plans/performance-optimization-plan.md`. Ready to execute?**

// annotation made by Requirements Auditor: ℹ️ Info Plan simplified based on user feedback:
// - Backup section removed (local use)
// - Monitoring section removed (local use)
// - Focus on prompt chunking (actual bottleneck)
// - File paths corrected to Next.js structure
