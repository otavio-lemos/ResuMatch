import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * FASE 4 - UI/State Integration (UUUIII)
 * 
 * Este store implementa a persistência de configurações de IA usando Zustand + localStorage.
 * Os tipos TypeScript estão alinhados com o SKILL.md conforme a Fase 4:
 * - getAtsParserSkill() → formatos de importação (Fase 1)
 * - getAtsAnalyzerSkill() → formatos de análise ATS (Fase 2)
 * - getAtsSummarySkill() → formatos de editor (Fase 3)
 * 
 * UI Reference: Ver getAtsUISkill() em lib/get-skill.ts
 */

export type AIProvider = 'gemini' | 'ollama' | 'openai' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
}

export interface AIConfigState {
  primaryAI: AISettings;
  importAI: AISettings;
  editorAI: AISettings;
  syncAllModels: boolean;
  importPrompt: string;
  summaryPrompt: string;
  rewritePrompt: string;
  grammarPrompt: string;
  atsPrompt: string;
  syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  setPrimaryAI: (settings: Partial<AISettings>) => void;
  setImportAI: (settings: Partial<AISettings>) => void;
  setEditorAI: (settings: Partial<AISettings>) => void;
  setSyncAllModels: (sync: boolean) => void;
  setImportPrompt: (prompt: string) => void;
  setAtsPrompt: (prompt: string) => void;
  setSummaryPrompt: (prompt: string) => void;
  setRewritePrompt: (prompt: string) => void;
  setGrammarPrompt: (prompt: string) => void;
  resetToDefaults: () => void;
}

const defaultAISettings: AISettings = {
  provider: 'gemini', apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
  model: 'gemini-2.5-flash', temperature: 0.7, topP: 0.9, topK: 40, maxTokens: 16384, frequencyPenalty: 0, presencePenalty: 0, timeout: 120000,
};

const defaultImportAISettings: AISettings = {
  provider: 'gemini', apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
  model: 'gemini-2.5-flash', temperature: 0.1, topP: 0.9, topK: 40, maxTokens: 16384, frequencyPenalty: 0, presencePenalty: 0, timeout: 120000,
};

const defaultEditorAISettings: AISettings = {
  provider: 'gemini', apiKey: '', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
  model: 'gemini-2.5-flash', temperature: 0.3, topP: 0.9, topK: 40, maxTokens: 2048, frequencyPenalty: 0, presencePenalty: 0, timeout: 60000,
};

const defaultImportPrompt = "Analise o currículo e extraia todas as informações relevantes.";
const defaultSummaryPrompt = `Você é um redator de currículos de elite, especializado em ATS (Workday, Taleo, Greenhouse).

## CONTEXTO DO CANDIDATO
Você receberá o JSON completo do currículo. Use os campos abaixo como fonte primária:
- personalInfo.title → cargo/posição atual
- experiences[] → histórico profissional e conquistas
- skills[] → stack técnica e competências
- education[] → formação relevante

## OBJETIVO
Gere um Resumo Profissional ATS-otimizado que ELEVE as métricas de conteúdo para os alvos.

## MÉTRICAS OBRIGATÓRIAS DE SAÍDA
- Total de palavras do resumo: entre 60 e 90 palavras
- Número de parágrafos: EXATAMENTE 3 parágrafos
- Caracteres por parágrafo: entre 67 e 94 caracteres por linha/parágrafo
- Estrutura: [Parágrafo 1: Identidade + Anos de Exp] [Parágrafo 2: Stack Técnica + Especialização] [Parágrafo 3: Impacto Comprovado + Diferencial]

## REGRAS DE CONTEÚDO
1. Comece com o cargo exato do candidato (sem "Eu sou" ou "Profissional com")
2. Inclua número concreto de anos de experiência (ex: "8+ anos")
3. Mencione pelo menos 3 tecnologias/skills do JSON
4. Inclua pelo menos 1 métrica de impacto (%, número, tempo)
5. Use linguagem direta, sem adjetivos genéricos ("apaixonado", "proativo", "dinâmico")
6. Caracteres especiais proibidos: aspas tipográficas " " → use aspas retas " "
7. Proibido: emojis, símbolos decorativos, markdown interno

## VERIFICAÇÃO ANTES DE RETORNAR
Antes de retornar a resposta, verifique mentalmente:
[ ] O resumo tem entre 60-90 palavras?
[ ] Tem exatamente 3 parágrafos?
[ ] Cada parágrafo tem entre 67-94 caracteres?
[ ] Começa com verbo de ação ou cargo (não com "Eu")?
[ ] Contém pelo menos 1 métrica quantitativa?
Se qualquer item falhar → reescreva antes de retornar.

## OUTPUT
RETORNE APENAS O TEXTO DO RESUMO. Sem introduções, sem "Aqui está", sem markdown.`;
const defaultRewritePrompt = `Você é um especialista em carreira e ATS, treinado para transformar bullets fracos em conquistas mensuráveis de alto impacto.

## CONTEXTO DA EXPERIÊNCIA
Você receberá:
- O texto bruto do bullet a ser reescrito
- O JSON da experiência (company, position, startDate, endDate)
- Skills técnicas relevantes do candidato

## OBJETIVO
Reescreva o bullet recebido como uma lista de 4 a 6 bullets ATS-otimizados usando o método STAR/XYZ.

## MÉTRICAS OBRIGATÓRIAS DE SAÍDA
- Número de bullets: entre 4 e 6 (NUNCA menos de 4, NUNCA mais de 7)
- Caracteres por bullet: entre 67 e 94 caracteres
- Cada bullet começa com: Verbo de Ação forte (passado se cargo encerrado, presente se atual)
- Cada bullet contém: pelo menos 1 métrica quantitativa (%, número, R$, tempo, escala)

## REGRAS DE CONSTRUÇÃO STAR
1. Use o cargo e empresa do JSON para inferir o contexto (Situação)
2. Extraia a tarefa/responsabilidade do texto bruto do usuário
3. Escolha o verbo de ação mais forte e específico para a ação realizada
4. Se o usuário não forneceu número → use placeholder [X%] ou [N usuarios] e sinalize
5. NUNCA invente dados concretos — use placeholders verificáveis
6. Caracteres especiais proibidos: aspas tipográficas, emojis, símbolos decorativos
7. Formato de bullet: usar hífen (-) ou bullet padrão (•), nunca asterisco ou seta

## FORMATO DE SAÍDA OBRIGATÓRIO
- Retorne SOMENTE a lista de bullets, um por linha
- Sem introdução, sem numeração, sem seção "Resultado:"
- Sem markdown além do bullet character

## VERIFICAÇÃO ANTES DE RETORNAR
[ ] Há entre 4 e 6 bullets?
[ ] Cada bullet começa com verbo de ação?
[ ] Cada bullet tem 67-94 caracteres?
[ ] Pelo menos 1 métrica quantitativa por bullet (ou placeholder)?
[ ] Nenhum bullet é uma cópia do original sem melhoria?
Se qualquer item falhar → reescreva antes de retornar.

## OUTPUT
RETORNE APENAS OS BULLETS. Sem introduções, sem títulos, sem markdown extra.`;

const defaultGrammarPrompt = `Você é um revisor gramatical cirúrgico especializado em textos profissionais e técnicos.

## OBJETIVO
Corrija APENAS erros gramaticais, ortográficos e de pontuação no texto recebido.
NÃO reescreva. NÃO melhore estilo. NÃO altere estrutura.

## O QUE CORRIGIR (permitido)
- Erros ortográficos (ex: "Sénior" → "Sênior" para PT-BR, ou manter "Sénior" para PT-PT)
- Concordância verbal e nominal
- Pontuação inconsistente
- Uso incorreto de maiúsculas em nomes comuns
- Tempos verbais inconsistentes dentro do mesmo bullet/parágrafo
- Uniformizar: todos os bullets terminam com ponto OU nenhum termina — nunca misto

## O QUE NÃO ALTERAR (proibido)
- Nomes de tecnologias, frameworks, ferramentas (React, Next.js, CI/CD, AWS, GCP, etc.)
- Siglas e acrônimos técnicos (API, REST, SQL, NoSQL, OCR, JWT, etc.)
- Números, percentuais e métricas quantitativas
- Verbos de ação no início dos bullets — não troque por sinônimos
- A estrutura e ordem dos bullets ou parágrafos
- O tone e voz do candidato

## REGRAS DE FORMATAÇÃO
- Aspas tipográficas (" ") → converter para aspas retas (" ")
- Travessão (—) → manter se já presente; não adicionar
- Hífen em palavras compostas técnicas → manter exatamente como está

## VERIFICAÇÃO ANTES DE RETORNAR
[ ] Algum nome de tecnologia foi alterado? Se sim → reverter
[ ] Algum número ou métrica foi mudado? Se sim → reverter
[ ] A estrutura do texto é idêntica ao original? Se não → reverter alterações estruturais
[ ] A pontuação dos bullets está uniforme?

## OUTPUT
RETORNE APENAS O TEXTO CORRIGIDO. Sem comentários, sem "Correções realizadas:", sem markdown.`;
const defaultAtsPrompt = `Você é um Analista ATS Sênior. Analise o currículo conforme os padrões de mercado ATS 2026 baseados em resumegeni.com.
Ano atual para cálculos: 2026

PADRÕES ATS OBRIGATÓRIOS (Referência: Workday, Greenhouse, iCIMS, Taleo, Lever, SmartRecruiters):

1. HEADERS/FOOTERS (Crítico):
   - Taleo ignora completamente
   - Workday frequentemente pula
   - Info deve estar no corpo do documento

2. ÍCONES/EMOJIS (Workday):
   - Workday lê como garbage characters
   - Usar "Phone:" não 📞, "Email:" não ✉️

3. SPECIAL CHARACTERS:
   - Smart quotes (") → aspas retas (")
   - Em-dashes (—) → hífen (-)
   - Non-ASCII → evitar para Taleo

4. TEXT BOXES (Taleo):
   - Conteúdo em text boxes é ignorado
   - Usar line breaks, não text boxes

5. LAYOUT COLUNAS:
   - Taleo: ZERO tolerância
   - Workday: Limitada
   - Greenhouse/Lever: Boa

6. FONTES:
   - Taleo: Arial, Calibri, Times New Roman apenas

7. DATAS:
   - Formato válido: MM/AAAA (ex: 10/2021 - 12/2024)
   - Inválidos: YYYY-MM, YYYY-MM-DD, DD/MM/AAAA

8. CERTIFICAÇÕES:
   - Expiradas há >3 anos: remover ou "(expired)"

9. EXPERIÊNCIAS ANTIGAS:
   - Início há >5 anos = sinalizar
   - Início há >10 anos = considerar remover

10. KEYWORDS:
    - Sem JD: 15-25 ideal
    - Com JD: 25-35 para >80% match
    - iCIMS extrai de TODO texto

1 1. HEADERS PADRÃO ATS:
    - InglÃªs: "Work Experience", "Education", "Skills"
    - Portugues: "Experiência Profissional", "Formação Acadêmica", "Competências" (ou "Habilidades")
    - Ambos são ACEITOS pelo ATS moderno. Recomende o padrão do idioma do currículo.

RETORNE APENAS JSON:
{
  "scores": { "design": 0-100, "estrutura": 0-100, "conteudo": 0-100 },
  "designChecks": [
    { "label": "Fontes", "passed": boolean, "feedback": "Use Arial, Calibri, Times New Roman" },
    { "label": "Layout Colunas", "passed": boolean, "feedback": "Taleo não suporta multi-colunas. Use coluna única." },
    { "label": "Text Boxes", "passed": boolean, "feedback": "Taleo ignora text boxes completamente" },
    { "label": "Ícones/Emoji", "passed": boolean, "feedback": "Workday lê ícones como garbage. Use texto." },
    { "label": "Headers/Footers", "passed": boolean, "feedback": "Taleo/Workday ignoram. Mova para corpo." },
    { "label": "Arquivo <5MB", "passed": boolean, "feedback": "iCIMS recomenda <5MB" }
  ],
  "estruturaChecks": [
    { "label": "Formato de Datas", "passed": boolean, "feedback": "Use MM/AAAA. Encontrado: [formato]" },
    { "label": "Smart Quotes", "passed": boolean, "feedback": "Converta smart quotes para aspas retas" },
    { "label": "Em-dashes", "passed": boolean, "feedback": "Converta em-dashes para hífen" },
    { "label": "Cabeçalhos Padrão", "passed": boolean, "feedback": "Use headers consistentes: 'Work Experience' ou 'Experiência Profissional' (ambos aceitos)" },
    { "label": "Seções Ausentes", "passed": boolean, "feedback": "Recomenda adicionar: [seções]" },
    { "label": "Certificações Expiradas", "passed": boolean, "feedback": "[Nome] expirada em [data]" },
    { "label": "Experiências Antigas", "passed": boolean, "feedback": "[Cargo] de [ano] há mais de X anos" },
    { "label": "Comprimento", "passed": boolean, "feedback": "X páginas - [recomendação]" }
  ],
  "conteudoMetrics": {
    "wordCount": { "value": 0, "target": "330-573", "status": "good|warning|danger" },
    "paragraphsPerSection": { "value": 0, "target": "3-5", "status": "good|warning|danger" },
    "experienceDescriptions": { "value": 0, "target": "4-7", "status": "good|warning|danger" },
    "starBullets": { "value": 0, "target": ">70%", "status": "good|warning|danger" },
    "keywordCount": { "value": 0, "target": "15-25", "status": "good|warning|danger" },
    "pageCount": { "value": 0, "target": "1-2", "status": "good|warning|danger" }
  },
  "jdMatch": { "score": 0-100, "matchedKeywords": [], "missingKeywords": [] },
  "improvedBullets": [
    { "section": "experience", "index": 0, "original": "...", "improved": "...", "reason": "Falta verbo de ação + métrica" }
  ],
  "detailedSuggestions": [
    { "type": "design", "field": "icones", "original": "📞 11999999999", "issue": "Workday lê ícones como garbage", "suggestion": "Substitua por 'Phone: 11 99999-9999'", "impact": "high" },
    { "type": "design", "field": "textbox", "original": "Conteúdo em text box", "issue": "Taleo ignora text boxes completamente", "suggestion": "Remova text boxes, use parágrafos", "impact": "high" },
    { "type": "design", "field": "colunas", "original": "Layout duas colunas", "issue": "Taleo não suporta multi-colunas", "suggestion": "Use layout coluna única", "impact": "high" },
    { "type": "estrutura", "field": "smartquotes", "original": "\"texto\"", "issue": "Smart quotes quebram em Taleo", "suggestion": "Converta para \"texto\"", "impact": "medium" },
    { "type": "estrutura", "field": "dates", "original": "2021-03", "issue": "Formato YYYY-MM inválido para ATS", "suggestion": "Converter para 03/2021", "impact": "high" },
    { "type": "estrutura", "field": "header", "original": "Email no header", "issue": "Taleo/Workday ignoram headers", "suggestion": "Mova email para corpo do documento", "impact": "high" },
    { "type": "estrutura", "field": "certifications", "original": "AWS Solutions Architect - 2018", "issue": "Certificação expirada há mais de 5 anos", "suggestion": "Remover ou listar como 'AWS Solutions Architect (expired 2018)'", "impact": "medium" },
    { "type": "estrutura", "field": "experience", "original": "Estagiário - 2012-2014", "issue": "Experiência há mais de 10 anos", "suggestion": "Considere remover ou reduzir para 1-2 bullets", "impact": "low" },
    { "type": "conteudo", "field": "experience", "original": "Trabalhei no projeto", "issue": "Falta verbo de ação e métrica", "suggestion": "Liderei projeto de X que resultou em Y% de melhoria", "impact": "high" }
  ]
}`;

export const useAISettingsStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      primaryAI: { ...defaultAISettings },
      importAI: { ...defaultImportAISettings },
      editorAI: { ...defaultEditorAISettings },
      syncAllModels: true,
      importPrompt: defaultImportPrompt,
      atsPrompt: defaultAtsPrompt,
      summaryPrompt: defaultSummaryPrompt,
      rewritePrompt: defaultRewritePrompt,
      grammarPrompt: defaultGrammarPrompt,
      syncStatus: 'idle',
      
      setPrimaryAI: (settings) => set((state) => {
        const newPrimaryAI = { ...state.primaryAI, ...settings };
        if (state.syncAllModels) {
          const syncUpdates: any = { primaryAI: newPrimaryAI };
          
          // Sync all main configuration fields
          const fieldsToSync: (keyof AISettings)[] = ['apiKey', 'provider', 'baseUrl', 'model'];
          
          fieldsToSync.forEach(field => {
            if (settings[field] !== undefined) {
              syncUpdates.importAI = { ...(syncUpdates.importAI || state.importAI), [field]: settings[field] };
              syncUpdates.editorAI = { ...(syncUpdates.editorAI || state.editorAI), [field]: settings[field] };
            }
          });
          
          return syncUpdates;
        }
        return { primaryAI: newPrimaryAI };
      }),
      setImportAI: (settings) => set((state) => ({ importAI: { ...state.importAI, ...settings } })),
      setEditorAI: (settings) => set((state) => ({ editorAI: { ...state.editorAI, ...settings } })),
      setSyncAllModels: (sync) => set((state) => {
        if (sync) {
           return {
             syncAllModels: sync,
             importAI: { ...state.importAI, apiKey: state.primaryAI.apiKey, provider: state.primaryAI.provider, baseUrl: state.primaryAI.baseUrl },
             editorAI: { ...state.editorAI, apiKey: state.primaryAI.apiKey, provider: state.primaryAI.provider, baseUrl: state.primaryAI.baseUrl }
           };
        }
        return { syncAllModels: sync };
      }),
      setImportPrompt: (prompt) => set({ importPrompt: prompt }),
      setAtsPrompt: (prompt) => set({ atsPrompt: prompt }),
      setSummaryPrompt: (prompt) => set({ summaryPrompt: prompt }),
      setRewritePrompt: (prompt) => set({ rewritePrompt: prompt }),
      setGrammarPrompt: (prompt) => set({ grammarPrompt: prompt }),
      
      resetToDefaults: () => set({
        primaryAI: { ...defaultAISettings },
        importAI: { ...defaultImportAISettings },
        editorAI: { ...defaultEditorAISettings },
        syncAllModels: true,
        importPrompt: defaultImportPrompt,
        atsPrompt: defaultAtsPrompt,
        summaryPrompt: defaultSummaryPrompt,
        rewritePrompt: defaultRewritePrompt,
        grammarPrompt: defaultGrammarPrompt,
      }),
    }),
    { name: 'ai-settings-storage' }
  )
);
