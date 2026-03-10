import { config, type Config } from '@/lib/config';

describe('Config', () => {
  describe('maxFileSize', () => {
    it('is 5MB in bytes', () => {
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it('is greater than 1MB', () => {
      expect(config.maxFileSize).toBeGreaterThan(1024 * 1024);
    });
  });

  describe('allowedFileTypes', () => {
    it('contains pdf', () => {
      expect(config.allowedFileTypes).toContain('pdf');
    });

    it('contains docx', () => {
      expect(config.allowedFileTypes).toContain('docx');
    });

    it('contains txt', () => {
      expect(config.allowedFileTypes).toContain('txt');
    });

    it('has exactly 3 types', () => {
      expect(config.allowedFileTypes).toHaveLength(3);
    });
  });

  describe('rateLimit', () => {
    it('has windowMs defined', () => {
      expect(config.rateLimit.windowMs).toBeDefined();
      expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    });

    it('has maxRequests defined', () => {
      expect(config.rateLimit.maxRequests).toBeDefined();
      expect(config.rateLimit.maxRequests).toBeGreaterThan(0);
    });

    it('windowMs is 15 minutes', () => {
      expect(config.rateLimit.windowMs).toBe(15 * 60 * 1000);
    });

    it('maxRequests is 100', () => {
      expect(config.rateLimit.maxRequests).toBe(100);
    });
  });

  describe('resume limits', () => {
    it('maxExperiences is 10', () => {
      expect(config.resume.maxExperiences).toBe(10);
    });

    it('maxEducations is 10', () => {
      expect(config.resume.maxEducations).toBe(10);
    });

    it('maxSkills is 50', () => {
      expect(config.resume.maxSkills).toBe(50);
    });
  });

  describe('ui config', () => {
    it('debounceMs is 300', () => {
      expect(config.ui.debounceMs).toBe(300);
    });

    it('animationDuration is 200', () => {
      expect(config.ui.animationDuration).toBe(200);
    });
  });

  describe('type exports', () => {
    it('Config type is defined', () => {
      const testConfig: Config = config;
      expect(testConfig).toBeDefined();
    });
  });

  describe('values are correct', () => {
    it('has expected structure', () => {
      expect(config.maxFileSize).toBeDefined();
      expect(config.allowedFileTypes).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.resume).toBeDefined();
      expect(config.ui).toBeDefined();
    });
  });
});
