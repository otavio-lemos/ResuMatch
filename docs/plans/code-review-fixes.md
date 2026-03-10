# Code Review Fixes Implementation Plan

> **For Claude:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all issues identified in code review: input validation, error handling, error boundaries, config extraction, logging standardization

**Architecture:** Each task is independent and can be completed in 2-5 minutes. Focus on one small fix at a time.

**Tech Stack:** Next.js 15, TypeScript, Zod, React

---

## Task 1: Add Zod validation to analyze API route

**Files:**
- Modify: `app/api/analyze/route.ts`

**Step 1: Read current implementation**
```bash
cat app/api/analyze/route.ts
```

**Step 2: Add Zod schema validation**
```typescript
import { z } from 'zod';

const analyzeSchema = z.object({
  content: z.string().min(1, "Content is required"),
  jobDescription: z.string().optional(),
  language: z.enum(['pt', 'en']).default('pt')
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = analyzeSchema.parse(body); // Add this line
    
    const { content, jobDescription, language } = validated;
    // ... rest of code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    // ... existing error handling
  }
}
```

**Step 3: Test the API**
```bash
# Should return 400 for invalid input
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{}'
```

**Step 4: Commit**
```bash
git add app/api/analyze/route.ts
git commit -m "feat(api): add Zod validation to analyze endpoint"
```

---

## Task 2: Add Zod validation to parse-resume API route

**Files:**
- Modify: `app/api/parse-resume/route.ts`

**Step 1: Read current implementation**
```bash
cat app/api/parse-resume/route.ts
```

**Step 2: Add Zod schema validation**
```typescript
import { z } from 'zod';

const parseResumeSchema = z.object({
  fileContent: z.string().min(1, "File content is required"),
  fileType: z.enum(['pdf', 'docx', 'txt']),
  language: z.enum(['pt', 'en']).default('pt')
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = parseResumeSchema.parse(body);
    
    const { fileContent, fileType, language } = validated;
    // ... rest of code
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    // ... existing error handling
  }
}
```

**Step 3: Commit**
```bash
git add app/api/parse-resume/route.ts
git commit -m "feat(api): add Zod validation to parse-resume endpoint"
```

---

## Task 3: Find all API routes and add validation

**Files:**
- Glob: `app/api/**/route.ts`
- Modify each route file

**Step 1: Find all API routes**
```bash
find app/api -name "route.ts" -type f
```

**Step 2: Check each for missing validation**
For each route found, check if it has Zod validation. If not, add it following Task 1 pattern.

**Step 3: Commit all validation fixes**
```bash
git add app/api/
git commit -m "feat(api): add Zod validation to remaining endpoints"
```

---

## Task 4: Create global error boundary component

**Files:**
- Create: `components/ErrorBoundary.tsx`

**Step 1: Create ErrorBoundary component**
```typescript
'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Commit**
```bash
git add components/ErrorBoundary.tsx
git commit -m "feat(ui): add ErrorBoundary component"
```

---

## Task 5: Wrap editor page with error boundary

**Files:**
- Modify: `app/editor/page.tsx`

**Step 1: Read current page**
```bash
cat app/editor/page.tsx
```

**Step 2: Add ErrorBoundary import and wrapper**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function EditorPage() {
  return (
    <ErrorBoundary>
      {/* existing content */}
    </ErrorBoundary>
  );
}
```

**Step 3: Commit**
```bash
git add app/editor/page.tsx
git commit -m "feat(ui): wrap editor with ErrorBoundary"
```

---

## Task 6: Wrap dashboard page with error boundary

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Read current page**
```bash
cat app/dashboard/page.tsx
```

**Step 2: Add ErrorBoundary wrapper**

**Step 3: Commit**
```bash
git add app/dashboard/page.tsx
git commit -m "feat(ui): wrap dashboard with ErrorBoundary"
```

---

## Task 7: Create config file for magic numbers

**Files:**
- Create: `lib/config.ts`

**Step 1: Create config file**
```typescript
export const config = {
  // File upload limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['pdf', 'docx', 'txt'] as const,
  
  // API limits
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  
  // Resume limits
  resume: {
    maxExperiences: 10,
    maxEducations: 10,
    maxSkills: 50
  },
  
  // UI
  ui: {
    debounceMs: 300,
    animationDuration: 200
  }
} as const;

export type Config = typeof config;
```

**Step 2: Commit**
```bash
git add lib/config.ts
git commit -m "feat(config): extract magic numbers to config file"
```

---

## Task 8: Replace magic numbers in rate-limit.ts

**Files:**
- Modify: `lib/rate-limit.ts`

**Step 1: Read current file**
```bash
cat lib/rate-limit.ts
```

**Step 2: Use config values**
```typescript
import { config } from './config';

// Replace hardcoded values with config.rateLimit
const WINDOW_MS = config.rateLimit.windowMs;
const MAX_REQUESTS = config.rateLimit.maxRequests;
```

**Step 3: Commit**
```bash
git add lib/rate-limit.ts
git commit -m "refactor: use config for rate limiting values"
```

---

## Task 9: Replace magic numbers in parse-resume API

**Files:**
- Modify: `app/api/parse-resume/route.ts`

**Step 1: Use config for maxFileSize**
```typescript
import { config } from '@/lib/config';

const MAX_SIZE = config.maxFileSize;
// Use MAX_SIZE instead of hardcoded 5 * 1024 * 1024
```

**Step 2: Commit**
```bash
git add app/api/parse-resume/route.ts
git commit -r "refactor: use config for file size limit"
```

---

## Task 10: Create standardized error handler utility

**Files:**
- Create: `lib/api-error.ts`

**Step 1: Create error handler**
```typescript
import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: error.errors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ error: error.message, details: error.details }),
      { status: error.statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.error('Unexpected error:', error);
  return new Response(
    JSON.stringify({ error: 'Internal server error' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}
```

**Step 2: Commit**
```bash
git add lib/api-error.ts
git commit -m "feat(util): add standardized API error handler"
```

---

## Task 11: Refactor analyze API to use error handler

**Files:**
- Modify: `app/api/analyze/route.ts`

**Step 1: Use handleApiError**
```typescript
import { handleApiError, successResponse } from '@/lib/api-error';

export async function POST(req: Request) {
  try {
    // ... validation and logic
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Step 2: Commit**
```bash
git add app/api/analyze/route.ts
git commit -m "refactor(api): use standardized error handler"
```

---

## Task 12: Refactor parse-resume API to use error handler

**Files:**
- Modify: `app/api/parse-resume/route.ts`

**Step 1: Use handleApiError**

**Step 2: Commit**
```bash
git add app/api/parse-resume/route.ts
git commit -m "refactor(api): use standardized error handler"
```

---

## Task 13: Create logger utility

**Files:**
- Create: `lib/logger.ts`

**Step 1: Create logger**
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const logger: Logger = {
  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
  info(message, meta) {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn(message, meta) {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error(message, meta) {
    console.error(`[ERROR] ${message}`, meta || '');
  }
};

export { logger };
```

**Step 2: Commit**
```bash
git add lib/logger.ts
git commit -m "feat(util): add logger utility"
```

---

## Task 14: Replace console.log in rate-limit.ts

**Files:**
- Modify: `lib/rate-limit.ts`

**Step 1: Use logger**
```typescript
import { logger } from './logger';

// Replace console.log with logger.info
logger.info('Rate limit exceeded', { ip, url, method });
```

**Step 2: Commit**
```bash
git add lib/rate-limit.ts
git commit -m "refactor: use logger in rate-limit"
```

---

## Task 15: Add authentication TODO in API routes

**Files:**
- Modify: `app/api/analyze/route.ts`, `app/api/parse-resume/route.ts`

**Step 1: Add TODO comment**
```typescript
// TODO: Add proper authentication before production
// Current: Using hardcoded 'local-user' for MVP
// Plan: Implement NextAuth.js or similar for production

export async function POST(req: Request) {
  // const session = await auth(); // Uncomment when auth is implemented
  // if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const userId = 'local-user'; // Replace with session.user.id when auth is ready
  // ...
}
```

**Step 2: Commit**
```bash
git add app/api/analyze/route.ts app/api/parse-resume/route.ts
git commit -m "docs: add auth TODO comments"
```

---

## Task 16: Run full lint check

**Step 1: Run ESLint**
```bash
npm run lint
```

**Step 2: Fix any remaining issues**

**Step 3: Commit any fixes**
```bash
git add . && git commit -m "fix: resolve lint issues"
```

---

## Task 17: Run tests

**Step 1: Run Jest**
```bash
npm run test
```

**Step 2: Fix any failing tests**

**Step 3: Commit**
```bash
git add . && git commit -m "test: ensure all tests pass"
```

---

## Task 18: Build and verify Docker

**Step 1: Build production Docker**
```bash
docker build -f Dockerfile -t resumatch .
```

**Step 2: Test container**
```bash
docker run -d -p 3000:3000 resumatch && curl http://localhost:3000
```

**Step 3: Commit final changes**
```bash
git add . && git commit -m "chore: final verification"
```

---

## Summary

This plan contains 18 small tasks that can be completed independently. Each task:
- Takes 2-5 minutes
- Has clear steps
- Ends with a commit
- Is self-contained

Total estimated time: 90-150 minutes

**To execute:** Use superpowers:subagent-driven-development
