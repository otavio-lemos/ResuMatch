import { OutputParserException } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { ResumeDataSchema, ATSAnalysisSchema, ResumeData, ATSAnalysis } from './types';

export function parseResume(raw: string): ResumeData {
  try {
    const parsed = JSON.parse(raw);
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
    const parsed = JSON.parse(raw);
    
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
Do not include any text before or after the JSON. Output only valid JSON.`;
}
