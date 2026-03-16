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
      const expCount = metrics.experienceDescriptions?.value || 3;
      const estimatedBullets = expCount * 4; // ~4 bullets per experience
      
      // starBullets: target is ">70%", so value should be percentage (0-100)
      // Gemini often returns absolute count instead of percentage
      // If value <= 50, likely it's absolute count (e.g., "20 bullets use STAR")
      if (metrics.starBullets?.value !== undefined) {
        const rawValue = metrics.starBullets.value;
        if (rawValue <= 50) {
          // Convert absolute count to percentage
          // If they say 20 bullets use STAR out of ~12 total = 167% → cap at 100%
          metrics.starBullets.value = Math.min(100, Math.round((rawValue / estimatedBullets) * 100));
        } else if (rawValue > 100) {
          // Clearly absolute count if > 100
          metrics.starBullets.value = Math.min(100, Math.round((rawValue / estimatedBullets) * 100));
        }
        // If value is already reasonable (51-100), assume it's a percentage
      }
      
      // keywordCount: target is "15-25", so value should be in that range
      // If value is high like 50-55, it's likely counting incorrectly
      if (metrics.keywordCount?.value !== undefined) {
        if (metrics.keywordCount.value > 30) {
          // Likely counting duplicates or all words - reduce to reasonable range
          metrics.keywordCount.value = Math.round(metrics.keywordCount.value / 2);
        }
        // Ensure minimum reasonable value
        if (metrics.keywordCount.value < 5) {
          metrics.keywordCount.value = 10;
        }
      }
      
      // wordCount: target is "330-573", cap at reasonable max if too high
      if (metrics.wordCount?.value !== undefined && metrics.wordCount.value > 600) {
        metrics.wordCount.value = Math.min(600, metrics.wordCount.value);
      }
      
      // paragraphsPerSection: if 0 or undefined, set default
      if (metrics.paragraphsPerSection?.value === undefined || metrics.paragraphsPerSection.value === 0) {
        metrics.paragraphsPerSection = { value: 3, target: "3-5", status: "good" };
      }
      // charsPerParagraph: if 0 or undefined, set default
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
