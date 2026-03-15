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
  _sectionHeaders: z.record(z.string(), z.string()).optional()
});

export const ATSAnalysisSchema = z.object({
  scores: z.object({
    design: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    content: z.number().min(0).max(100)
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
  contentMetrics: z.object({
    wordCount: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    paragraphsPerSection: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    charsPerParagraph: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    experienceDescriptions: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    starBullets: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    keywordCount: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional(),
    pageCount: z.object({ value: z.number(), target: z.string(), status: z.string() }).optional()
  }).optional(),
  jdMatch: z.object({
    score: z.number().min(0).max(100),
    matchedKeywords: z.array(z.string()),
    missingKeywords: z.array(z.string())
  }).optional(),
  detailedSuggestions: z.array(z.object({
    type: z.string().optional(),
    field: z.string().optional(),
    section: z.string().optional(),
    original: z.string().optional(),
    issue: z.string().optional(),
    label: z.string().optional(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    impact: z.enum(['high', 'medium', 'low']).optional()
  })).optional()
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
