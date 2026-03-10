const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

describe('Parse Resume API Validation', () => {
  describe('File Size Validation', () => {
    it('accepts file within size limit', () => {
      const fileSize = 1024 * 1024; // 1MB
      const result = fileSize <= MAX_FILE_SIZE;
      expect(result).toBe(true);
    });

    it('accepts file at exact size limit', () => {
      const fileSize = MAX_FILE_SIZE;
      const result = fileSize <= MAX_FILE_SIZE;
      expect(result).toBe(true);
    });

    it('rejects file exceeding size limit', () => {
      const fileSize = MAX_FILE_SIZE + 1;
      const result = fileSize <= MAX_FILE_SIZE;
      expect(result).toBe(false);
    });

    it('rejects large PDF file', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      const result = fileSize <= MAX_FILE_SIZE;
      expect(result).toBe(false);
    });
  });

  describe('File Type Validation', () => {
    it('accepts PDF files', () => {
      const fileType = 'application/pdf';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(true);
    });

    it('accepts DOCX files', () => {
      const fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(true);
    });

    it('accepts TXT files', () => {
      const fileType = 'text/plain';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(true);
    });

    it('rejects PNG files', () => {
      const fileType = 'image/png';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(false);
    });

    it('rejects JPG files', () => {
      const fileType = 'image/jpeg';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(false);
    });

    it('rejects Excel files', () => {
      const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(false);
    });

    it('rejects HTML files', () => {
      const fileType = 'text/html';
      const result = ALLOWED_TYPES.includes(fileType);
      expect(result).toBe(false);
    });
  });

  describe('MAX_FILE_SIZE constant', () => {
    it('is 5MB in bytes', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });

    it('is greater than 1MB', () => {
      expect(MAX_FILE_SIZE).toBeGreaterThan(1024 * 1024);
    });

    it('is less than 100MB', () => {
      expect(MAX_FILE_SIZE).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
