import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const RESUME_DIR = join(DATA_DIR, 'resumes');
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

console.log('[STORAGE] RESUME_DIR:', RESUME_DIR);
console.log('[STORAGE] process.cwd():', process.cwd());

export async function saveResume(resumeData: any, fileName?: string): Promise<string> {
  console.log('[STORAGE] saveResume called, dir:', RESUME_DIR);
  try {
    await fs.mkdir(RESUME_DIR, { recursive: true });
    console.log('[STORAGE] Directory created/verified');
  } catch (mkdirErr) {
    console.error('[STORAGE] Error creating directory:', mkdirErr);
  }
  
  const jsonString = JSON.stringify(resumeData, null, 2);
  
  if (jsonString.length > MAX_RESUME_SIZE_BYTES) {
    throw new Error(`Currículo muito grande (${Math.round(jsonString.length / 1024)}KB). Máximo: 10MB`);
  }
  
  const id = fileName || Date.now().toString();
  const filePath = join(RESUME_DIR, `${id}.json`);
  
  console.log('[STORAGE] Writing to:', filePath);
  await fs.writeFile(filePath, jsonString);
  console.log('[STORAGE] File written successfully');
  
  return id;
}

export async function loadResume(resumeId: string): Promise<any> {
  const filePath = join(RESUME_DIR, `${resumeId}.json`);
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function listResumes(): Promise<Array<{
  id: string;
  createdAt: string;
  title?: string;
  score?: number;
  scores?: {
    design?: number;
    estrutura?: number;
    conteudo?: number;
  };
}>> {
  await fs.mkdir(RESUME_DIR, { recursive: true });
  const files = await fs.readdir(RESUME_DIR);

  const resumes = await Promise.all(
    files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const id = file.replace('.json', '');
        const filePath = join(RESUME_DIR, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          const stats = await fs.stat(filePath);

          const title = (data.personalInfo?.fullName && data.personalInfo.fullName.trim() !== '')
            ? data.personalInfo.fullName
            : (data.title || 'Sem Título');

          return {
            id,
            createdAt: stats.mtime.toISOString(),
            title,
            score: data.aiAnalysis?.scores ? Math.round((data.aiAnalysis.scores.design + data.aiAnalysis.scores.estrutura + data.aiAnalysis.scores.conteudo) / 3) : undefined,
            scores: data.aiAnalysis?.scores ? {
              design: data.aiAnalysis.scores.design,
              estrutura: data.aiAnalysis.scores.estrutura,
              conteudo: data.aiAnalysis.scores.conteudo
            } : undefined
          };
        } catch (error) {
          console.error(`Error reading resume file ${file}:`, error);
          return null;
        }
      })
  );

  return resumes.filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function deleteResumeLocal(resumeId: string): Promise<boolean> {
  const filePath = join(RESUME_DIR, `${resumeId}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to delete resume ${resumeId}:`, error);
    return false;
  }
}
