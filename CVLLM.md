# ResumeMatch: Arquitetura de Inteligência Artificial (CVLLM)

Este documento define as diretrizes obrigatórias e a estrutura de funcionamento do motor de IA do ResuMatch, garantindo que o sistema utilize estritamente as regras de negócio definidas nos arquivos de Skill.

---

## 🏗️ Princípio Fundamental: Skill-Driven AI

Toda e qualquer interação com modelos de linguagem (LLMs) no sistema **DEVE** obrigatoriamente ser guiada por um fragmento do arquivo `.agent/skills/ats-analyzer/SKILL.md`.

O sistema não possui instruções "soltas" ou inventadas no código. A inteligência é injetada via `systemInstruction` (no Gemini) ou `system role` (no OpenAI) a partir de blocos demarcados no arquivo de Skill.

---

## ⚡ As 3 Fases da Inteligência

O motor de IA está dividido em três canais independentes, cada um configurável individualmente na interface `/config`.

### 1. FASE DE IMPORTAÇÃO (Parsing)
*   **Objetivo:** Extrair dados de documentos desestruturados (PDF, DOCX, TXT) para o formato JSON rigoroso do sistema.
*   **Skill Obrigatória:** `########## PPPAAARRRSSSIIINNNGGG`
*   **Regras Críticas:** Zero alucinação, fidelidade absoluta aos dados originais, padronização de datas para `MM/AAAA`.
*   **Implementação:** Localizada em `app/api/parse-resume/route.ts` e `parseResumeFromPDF` em `app/actions/ai.ts`.

### 2. FASE DE AUDITORIA (ATS Analysis)
*   **Objetivo:** Pontuar o currículo conforme padrões de mercado 2026 (Workday, Taleo, Greenhouse) e sugerir melhorias.
*   **Skill Obrigatória:** `########## AAAUUUDDDIIITTTOOORRRIIIAAA`
*   **Regras Críticas:** Análise obrigatória de todos os campos, validação STAR, checagem de keywords e legibilidade OCR.
*   **Implementação:** Localizada em `app/api/analyze/route.ts` e `generateATSAnalysis` em `app/actions/ai.ts`.

### 3. FASE DE EDIÇÃO (Editor IA)
*   **Objetivo:** Realizar ações cirúrgicas de escrita: Gerar Resumo, Reformular (STAR) e Corrigir Gramática.
*   **Skill Obrigatória:** `########## EEEDDDIIITTTOOORRR`
*   **Regras Críticas:** Resumo em no máximo 4 linhas, bullets baseados em impacto mensurável (%), manutenção do tom original.
*   **Implementação:** Localizada em `app/actions/ai.ts` (funções `rewriteText`, `correctGrammar`, `generateSummaryAI`).

---

## 🛠️ Detalhes de Implementação

### Carregamento de Skills (`lib/get-skill.ts`)
As funções `getAtsParserSkill`, `getAtsAnalyzerSkill` e `getAtsSummarySkill` são os únicos pontos de entrada para as regras da IA. Elas leem o arquivo físico no disco e extraem o conteúdo entre as tags de marcação (ex: `########## PPPAAARRRSSSIIINNNGGG`).

### Transparência e Realismo (Streaming)
Para garantir que a experiência seja realista e não inventada:
1.  **SSE (Server-Sent Events):** As APIs de Análise e Importação utilizam streaming. O texto que aparece no chat é o texto real vindo da LLM em tempo real.
2.  **Fim do "Chat Falso":** Foram removidos todos os atrasos manuais (`setTimeout`) e mensagens pré-programadas que simulavam pensamento. Se há movimento na tela, há processamento real.

### Segurança de Credenciais
*   **Headers sobre URL:** A chave de API (`apiKey`) **NUNCA** é enviada via query string (`?key=...`). Ela trafega exclusivamente pelo cabeçalho seguro `x-goog-api-key`, protegendo os logs contra vazamentos.

---

## 📝 Como modificar a inteligência?
Para alterar qualquer comportamento da IA (ex: mudar o formato de data ou a rigorosidade da pontuação), **não altere o código TypeScript**. Altere diretamente o arquivo:
`./.agent/skills/ats-analyzer/SKILL.md`

O sistema refletirá a mudança na próxima chamada de API.
