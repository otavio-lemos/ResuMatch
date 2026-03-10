# Code Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical gaps, duplicates, and error possibilities identified in the code audit to prevent recurring errors.

**Architecture:** Each task is independent and can be completed separately. Fixes are prioritized by severity (critical first).

**Tech Stack:** Next.js 15, TypeScript, Zustand, Jest

---

## Chunk 1: Critical Fixes (Priority 1)

### Task 1: Fix JSON Parse Error to Show Original Text

**Files:**
- Modify: `lib/ai-utils.ts:40-48`

- [ ] **Step 1: Read current implementation**

Run: `cat lib/ai-utils.ts`

- [ ] **Step 2: Verify fix already applied (check for snippet in error message)**

The fix was already applied in previous session. Verify:

Run: `grep -n "substring(0, 200)" lib/ai-utils.ts`
Expected: Should show line with 200

If not applied, add this change:
```typescript
// Replace line 45-46:
throw new Error(`Falha ao processar resposta da IA: ${err.message}. Texto recebido: ${text.substring(0, 200)}...`);
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai-utils.ts
git commit -m "fix: show original text in JSON parse errors"
```

---

### Task 2: Fix Rate Limit Memory Leak

**Files:**
- Modify: `lib/rate-limit.ts:8-24`

- [ ] **Step 1: Read current implementation**

Run: `cat lib/rate-limit.ts`

- [ ] **Step 2: Verify fix already applied**

Run: `grep -n "cleanupExpiredEntries" lib/rate-limit.ts`
Expected: Should show cleanup function

If not applied, add:
```typescript
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    
    for (const [key, record] of store.entries()) {
        if (now > record.resetTime) {
            store.delete(key);
        }
    }
    lastCleanup = now;
}
```

- [ ] **Step 3: Add call to cleanup in checkRateLimit**

Run: `grep -n "function checkRateLimit" lib/rate-limit.ts`
Add as first line: `cleanupExpiredEntries();`

- [ ] **Step 4: Commit**

```bash
git add lib/rate-limit.ts
git commit -m "fix: prevent rate limit map memory leak"
```

---

### Task 3: Add Timeout to Stream Reader

**Files:**
- Modify: `store/useResumeStore.ts:374-400`

- [ ] **Step 1: Verify timeout already added**

Run: `grep -n "AbortController" store/useResumeStore.ts`
Expected: Should find AbortController and timeout

If not applied, add in analyzeResume function:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000);

// In fetch call, add signal:
signal: controller.signal

// After fetch response (success or error), clear:
clearTimeout(timeoutId);
```

- [ ] **Step 2: Commit**

```bash
git add store/useResumeStore.ts
git commit -m "fix: add timeout to stream reader to prevent hangs"
```

---

### Task 4: Fix Structure/Estrutura Naming Inconsistency

**Files:**
- Modify: `store/useResumeStore.ts:96-120`
- Modify: `lib/get-skill.ts:110-150`

- [ ] **Step 1: Read store type definitions**

Run: `sed -n '94,120p' store/useResumeStore.ts`

- [ ] **Step 2: Add normalization for API response**

Find where AIAnalysis is parsed and add normalization function. Add after imports:

```typescript
function normalizeApiResponse(data: any): any {
  if (!data) return data;
  
  const normalized = { ...data };
  
  // Handle scores - API might return "structure" instead of "estrutura"
  if (normalized.scores) {
    if (normalized.scores.estrutura === undefined && normalized.scores.structure !== undefined) {
      normalized.scores.estrutura = normalized.scores.structure;
    }
  }
  
  // Handle checks arrays
  if (normalized.estruturaChecks === undefined && normalized.structureChecks !== undefined) {
    normalized.estruturaChecks = normalized.structureChecks;
  }
  
  return normalized;
}
```

- [ ] **Step 3: Apply normalization in analyzeResume**

Find line where result is parsed and apply:
```typescript
const result = normalizeApiResponse(JSON.parse(fullResult));
```

- [ ] **Step 4: Commit**

```bash
git add store/useResumeStore.ts
git commit -m "fix: normalize API response structure/estrutura fields"
```

---

## Chunk 2: Medium Priority Fixes

### Task 5: Add Better Error Messages for Missing API Keys

**Files:**
- Modify: `app/actions/ai.ts:19-43`

- [ ] **Step 1: Read current getAIClient function**

Run: `sed -n '19,43p' app/actions/ai.ts`

- [ ] **Step 2: Improve error message**

Replace throw with detailed error:
```typescript
throw new Error('Configuração de IA não encontrada. Defina a chave API nas configurações ou configure GEMINI_API_KEY no ambiente.');
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/ai.ts
git commit -m "fix: improve API key error message"
```

---

### Task 6: Add Skill Existence Check with Fallback Warning

**Files:**
- Modify: `lib/get-skill.ts:42-97`

- [ ] **Step 1: Read getAtsParserSkill function**

Run: `sed -n '42,97p' lib/get-skill.ts`

- [ ] **Step 2: Add warning when skill returns empty**

After line with `if (!fase)`, add console.warn:
```typescript
if (!fase) {
  console.warn(`[Skill] ${skillName}: Fase não encontrada para idioma ${language}`);
  return language === 'en' 
    ? "You are a resume data extractor." 
    : "Você é um extrator de dados de currículos.";
}
```

- [ ] **Step 3: Apply same pattern to other getSkill functions**

Run: `grep -n "if (!fase)" lib/get-skill.ts`
Apply warning to all occurrences

- [ ] **Step 4: Commit**

```bash
git add lib/get-skill.ts
git commit -m "fix: add warnings for missing skill content"
```

---

### Task 7: Add File Size Validation in Storage

**Files:**
- Modify: `lib/storage/resume-storage.ts`

- [ ] **Step 1: Read current storage implementation**

Run: `cat lib/storage/resume-storage.ts`

- [ ] **Step 2: Add max file size constant and validation**

Add at top of file:
```typescript
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
```

Add validation in saveResume:
```typescript
export async function saveResume(resumeData: any, fileName?: string): Promise<string> {
  const jsonString = JSON.stringify(resumeData, null, 2);
  
  if (jsonString.length > MAX_RESUME_SIZE_BYTES) {
    throw new Error(`Currículo muito grande (${Math.round(jsonString.length / 1024)}KB). Máximo: 10MB`);
  }
  
  // ... rest of function
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/storage/resume-storage.ts
git commit -m "fix: add file size validation to prevent huge resumes"
```

---

### Task 8: Fix Store Merge to Preserve Default Fields

**Files:**
- Modify: `store/useResumeStore.ts:329-342`

- [ ] **Step 1: Find the merge logic**

Run: `sed -n '329,342p' store/useResumeStore.ts`

- [ ] **Step 2: Improve merge logic**

Replace spread operator merge with explicit field handling:
```typescript
const mergedData: ResumeData = {
  ...EMPTY_RESUME_DATA,
  personalInfo: { 
    ...EMPTY_RESUME_DATA.personalInfo, 
    ...(data.personalInfo || {}) 
  },
  appearance: { 
    ...EMPTY_RESUME_DATA.appearance, 
    ...(data.appearance || {}) 
  },
  experiences: data.experiences || EMPTY_RESUME_DATA.experiences,
  education: data.education || EMPTY_RESUME_DATA.education,
  skills: data.skills || EMPTY_RESUME_DATA.skills,
  projects: data.projects || EMPTY_RESUME_DATA.projects,
  templateId: data.templateId || EMPTY_RESUME_DATA.templateId,
  sectionsConfig: mergedSections,
  summary: data.summary || EMPTY_RESUME_DATA.summary,
  aiAnalysis: data.aiAnalysis || data.ai_analysis || undefined,
  jdAnalysis: data.jdAnalysis || undefined,
  jobDescription: data.jobDescription || '',
  language: data.language || 'pt',
};
```

- [ ] **Step 3: Commit**

```bash
git add store/useResumeStore.ts
git commit -m "fix: preserve default fields when merging resume data"
```

---

### Task 9: Add Try-Catch to Dynamic Import

**Files:**
- Modify: `store/useResumeStore.ts:530-546`

- [ ] **Step 1: Find translateResume function**

Run: `sed -n '530,546p' store/useResumeStore.ts`

- [ ] **Step 2: Wrap dynamic import with error handling**

Replace function body:
```typescript
translateResume: async (targetLang, authSettings) => {
  const { data, setFullData, setSyncStatus } = get();
  if (data.language === targetLang) return;
  setSyncStatus('saving');
  try {
    const aiModule = await import('@/app/actions/ai').catch(() => {
      throw new Error('Failed to load AI module');
    });
    const { translateResumeData } = aiModule;
    if (!translateResumeData) {
      throw new Error('translateResumeData not available');
    }
    const { response: translatedData } = await translateResumeData(data, targetLang, authSettings);
    // ... rest of function
  } catch (error: any) {
    console.error('Translation failed:', error);
    setSyncStatus('error');
  }
},
```

- [ ] **Step 3: Commit**

```bash
git add store/useResumeStore.ts
git commit -m "fix: add error handling to dynamic import"
```

---

## Chunk 3: Code Quality Improvements

### Task 10: Remove Duplicate Rate Limit Implementation

**Files:**
- Modify: `app/api/analyze/route.ts:18-34`
- Modify: `lib/rate-limit.ts` (use existing)

- [ ] **Step 1: Check if lib/rate-limit.ts is used anywhere**

Run: `grep -r "from '@/lib/rate-limit'" app/`
Expected: Should find imports

- [ ] **Step 2: If not used, import and use the library function**

In analyze/route.ts, add import:
```typescript
import { rateLimit, addRateLimitHeaders } from '@/lib/rate-limit';
```

Replace inline rate limit with:
```typescript
const rateLimitCheck = rateLimit({ windowMs: 60000, maxRequests: 10 });
const { allowed, remaining, resetIn } = rateLimitCheck(req);

if (!allowed) {
  return addRateLimitHeaders(
    NextResponse.json({ error: "Limite de uso da IA atingido. Tente novamente em 60 segundos." }, { status: 429 }),
    remaining,
    resetIn
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/analyze/route.ts lib/rate-limit.ts
git commit -m "refactor: use centralized rate limit in analyze route"
```

---

### Task 11: Extract SSE Streaming to Shared Utility

**Files:**
- Create: `lib/sse-stream.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `app/api/parse-resume/route.ts`

- [ ] **Step 1: Create SSE streaming utility**

Create `lib/sse-stream.ts`:
```typescript
import { TextEncoder } from 'util';

export function createSSEStream(
  chunks: AsyncIterable<any>,
  onProgress?: (stage: string, message: string) => void,
  onComplete?: (data: any) => void,
  onError?: (error: string) => void
): ReadableStream {
  const encoder = new TextEncoder();
  let fullText = '';
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const text = chunk.text();
          fullText += text;
          controller.enqueue(encoder.encode(`data: {"type": "chunk", "content": ${JSON.stringify(text)}}\n\n`));
        }
        
        if (onComplete) {
          onComplete(fullText);
        }
        
        controller.close();
      } catch (error: any) {
        if (onError) {
          controller.enqueue(encoder.encode(`data: {"type": "error", "message": ${JSON.stringify(error.message || "Erro desconhecido")}}\n\n`));
        }
        controller.close();
      }
    }
  });
}

export function createProgressMessage(encoder: TextEncoder, stage: string, message: string): Uint8Array {
  return encoder.encode(`data: {"type": "progress", "stage": "${stage}", "message": "${message}"}\n\n`);
}
```

- [ ] **Step 2: Update analyze route to use utility**

- [ ] **Step 3: Update parse-resume route to use utility**

- [ ] **Step 4: Commit**

```bash
git add lib/sse-stream.ts app/api/analyze/route.ts app/api/parse-resume/route.ts
git commit -m "refactor: extract SSE streaming to shared utility"
```

---

## Chunk 4: Tests

### Task 12: Add Tests for Critical Fixes

**Files:**
- Create: `__tests__/lib/ai-utils.test.ts`
- Create: `__tests__/lib/rate-limit.test.ts`

- [ ] **Step 1: Write test for robustJsonParse**

```typescript
import { robustJsonParse } from '@/lib/ai-utils';

describe('robustJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = robustJsonParse('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('should handle JSON with markdown fences', () => {
    const result = robustJsonParse('```json\n{"name": "test"}\n```');
    expect(result).toEqual({ name: 'test' });
  });

  it('should handle trailing commas', () => {
    const result = robustJsonParse('{"name": "test",}');
    expect(result).toEqual({ name: 'test' });
  });

  it('should throw with original text on failure', () => {
    expect(() => robustJsonParse('{invalid')).toThrow(/Texto recebido/);
  });

  it('should throw on empty input', () => {
    expect(() => robustJsonParse('')).toThrow('empty');
  });
});
```

- [ ] **Step 2: Write test for rate limit cleanup**

```typescript
import { checkRateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('should allow requests within limit', () => {
    const result = checkRateLimit('test-user-1', { windowMs: 60000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should block when limit exceeded', () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    checkRateLimit('test-user-2', config);
    const result = checkRateLimit('test-user-2', config);
    expect(result.allowed).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add __tests__/lib/ai-utils.test.ts __tests__/lib/rate-limit.test.ts
git commit -m "test: add tests for critical fixes"
```

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | JSON parse error shows original text | ✅ Already applied |
| 2 | Rate limit memory leak | ✅ Already applied |
| 3 | Stream reader timeout | ✅ Already applied |
| 4 | Structure/Estrutura naming | Pending |
| 5 | Better API key error | Pending |
| 6 | Skill warning | Pending |
| 7 | File size validation | Pending |
| 8 | Store merge preserve fields | Pending |
| 9 | Dynamic import error handling | Pending |
| 10 | Remove duplicate rate limit | Pending |
| 11 | Extract SSE utility | Pending |
| 12 | Add tests | Pending |

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-10-code-audit-fixes.md`. Ready to execute?**
