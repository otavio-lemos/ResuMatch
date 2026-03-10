export const config = {
  maxFileSize: 5 * 1024 * 1024,
  allowedFileTypes: ['pdf', 'docx', 'txt'] as const,
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },
  
  resume: {
    maxExperiences: 10,
    maxEducations: 10,
    maxSkills: 50
  },
  
  ui: {
    debounceMs: 300,
    animationDuration: 200
  }
} as const;

export type Config = typeof config;
