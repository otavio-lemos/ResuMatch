import { OutputParserException } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { ResumeDataSchema, ATSAnalysisSchema, ResumeData, ATSAnalysis } from './types';

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  const fenceRegex = /^```(\w+)?\s*\n?/;
  while (fenceRegex.test(cleaned)) {
    cleaned = cleaned.replace(fenceRegex, '').replace(/```\s*$/, '').trim();
  }
  return cleaned;
}

export function parseResume(raw: string): ResumeData {
  try {
    const cleaned = stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
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
    const cleaned = stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
    
    // Normalize scores - accept both PT (estrutura/conteudo) and EN (structure/content)
    if (parsed.scores) {
      if (parsed.scores.structure && !parsed.scores.estrutura) {
        parsed.scores.estrutura = parsed.scores.structure;
      }
      if (parsed.scores.content && !parsed.scores.conteudo) {
        parsed.scores.conteudo = parsed.scores.content;
      }
      if (parsed.scores.estrutura && !parsed.scores.structure) {
        parsed.scores.structure = parsed.scores.estrutura;
      }
      if (parsed.scores.conteudo && !parsed.scores.content) {
        parsed.scores.content = parsed.scores.conteudo;
      }
    }
    
    // Normalize content metrics - accept both PT (conteudoMetrics) and EN (contentMetrics)
    if (parsed.contentMetrics && !parsed.conteudoMetrics) {
      parsed.conteudoMetrics = parsed.contentMetrics;
    } else if (parsed.conteudoMetrics && !parsed.contentMetrics) {
      parsed.contentMetrics = parsed.conteudoMetrics;
    }
    
    // Normalize metrics that Gemini often returns incorrectly
    const metrics = parsed.contentMetrics || parsed.conteudoMetrics;
    if (metrics) {
      // starBullets: if value > 100, it's likely an absolute count - convert to percentage
      if (metrics.starBullets?.value !== undefined && metrics.starBullets.value > 100) {
        const bulletCount = metrics.starBullets.value;
        // Estimate: assume ~3-4 bullets per experience, 3 experiences = ~10 bullets total
        const estimatedBullets = (metrics.experienceDescriptions?.value || 3) * 4;
        metrics.starBullets.value = Math.min(100, Math.round((bulletCount / estimatedBullets) * 100));
      }
      // wordCount: if > 1000, cap it reasonably
      if (metrics.wordCount?.value !== undefined && metrics.wordCount.value > 1000) {
        metrics.wordCount.value = Math.min(1000, metrics.wordCount.value);
      }
      // keywordCount: if > 50, cap it reasonably
      if (metrics.keywordCount?.value !== undefined && metrics.keywordCount.value > 50) {
        metrics.keywordCount.value = Math.min(50, metrics.keywordCount.value);
      }
      // paragraphsPerSection: if 0, set default
      if (metrics.paragraphsPerSection?.value === undefined || metrics.paragraphsPerSection.value === 0) {
        metrics.paragraphsPerSection = { value: 3, target: "3-5", status: "good" };
      }
      // charsPerParagraph: if 0, set default
      if (metrics.charsPerParagraph?.value === undefined || metrics.charsPerParagraph.value === 0) {
        metrics.charsPerParagraph = { value: 80, target: "67-94", status: "good" };
      }
    }
    
    return ATSAnalysisSchema.parse(parsed);
  } catch (e) {
    throw new OutputParserException(
      `Failed to parse ATS analysis: ${e instanceof Error ? e.message : 'Unknown error'}`,
      raw
    );
  }
}

export function getJsonFormatInstructions(schema: z.ZodType<any>): string {
  return `You must respond with valid JSON that conforms to the schema.
Do NOT wrap the JSON in markdown code fences (\`\`\`). Output only valid JSON, no additional text.`;
}
