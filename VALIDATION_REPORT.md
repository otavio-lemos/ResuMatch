# Validação Completa do Sistema - Interação LLM e Ollama

## Resumo Executivo
O sistema apresenta **inconsistências críticas** na configuração de provedores de IA, resultando no **suporte parcial e quebrado** para modelos locais (Ollama) e OpenAI.
A validação identificou que **Ollama não funciona** devido a bugs no código de autenticação e que **API Routes são exclusivas do Gemini**, ignorando configurações do usuário.

---

## 1. Validação de Ollama (Modelos Locais)

### 1.1 Bug Crítico em `app/actions/ai.ts`
**Arquivo:** `app/actions/ai.ts`
**Função:** `getAIClient`

**Problema:**
A função verifica `if (authSettings?.apiKey)` (linha 20).
Para o provedor `ollama`, o `apiKey` padrão no store é uma string vazia (`''`).
Como string vazia é falsa em JavaScript, o bloco `if` é ignorado e o código cai no fallback do Gemini (linha 42).
Se a variável de ambiente `GEMINI_API_KEY` não estiver definida, o sistema lança o erro: `"Configuração de IA não encontrada..."`.

**Impacto:**
- Ollama não pode ser usado via Server Actions (ex: `parseResumeFromPDF`, `generateATSAnalysis` via ação direta).
- O sistema tenta usar Gemini mesmo quando o usuário seleciona Ollama.

**Localização:** `app/actions/ai.ts:20`

### 1.2 Configuração de Rede no Docker
**Arquivo:** `docker-compose.yml`

**Problema:**
O `docker-compose.yml` não inclui um serviço Ollama.
A configuração padrão do sistema (`useAISettingsStore.ts`) aponta para `http://host.docker.internal:11434/v1`.
Isso assume que o Ollama está rodando na **máquina host** (fora do container).

**Verificação:**
- `Dockerfile-DevOps` e `Dockerfile` não instalam Ollama (correto, pois é externo).
- O uso de `host.docker.internal` é válido para Docker Desktop, mas depende do Ollama estar ativo no host.

**Impacto:**
- Funciona apenas se Ollama estiver rodando no host.
- Se o usuário tentar rodar Ollama dentro do Docker Compose, a configuração precisa ser alterada para usar o nome do serviço (ex: `http://ollama:11434/v1`).

---

## 2. Interação com LLM (Skills e Respostas)

### 2.1 Passagem de Skills
**Arquivo:** `lib/get-skill.ts`

**Verificação:**
- O sistema carrega corretamente os arquivos `SKILL.md` de `.agent/skills/`.
- A função `getAtsAnalyzerSkill` extrai a seção de "Auditoria" corretamente.
- O conteúdo da skill é passado como `systemInstruction` no `callAI`.

**Conclusão:**
✅ A passagem de skills está funcionando corretamente.

### 2.2 Parsing de Respostas JSON
**Arquivo:** `lib/ai-utils.ts`

**Verificação:**
- A função `robustJsonParse` lida com formatos de resposta variados (Markdown, texto cru).
- Suporta extração de JSON aninhado em blocos de código.

**Conclusão:**
✅ O parsing de respostas da LLM é robusto.

---

## 3. Inconsistências Arquitetônicas Críticas

### 3.1 API Routes vs Server Actions
O sistema possui dois caminhos distintos para interação com IA, com suporte a provedores drasticamente diferentes:

| Característica | Server Actions (`app/actions/ai.ts`) | API Routes (`app/api/analyze/route.ts`) |
| :--- | :--- | :--- |
| **Provedores Suportados** | Gemini, OpenAI, Ollama (parcialmente) | **Apenas Gemini** |
| **Lógica de Autenticação** | Dinâmica (baseada em `provider`) | **Hardcoded** (x-goog-api-key) |
| **Endpoint** | Dinâmico (OpenAI Compat. ou Gemini) | **Hardcoded** (`:streamGenerateContent`) |
| **Uso na UI** | `parseResumeFromPDF` (Editor) | `analyzeResume` (Dashboard) |

**Problema Específico nas API Routes (`app/api/analyze/route.ts` e `app/api/parse-resume/route.ts`):**

1.  **Ignoram o provedor selecionado:**
    ```typescript
    const baseUrl = aiSettings?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/';
    ```
    Mesmo que o usuário envie `baseUrl` do Ollama, o código continua usando o formato de endpoint do Gemini.

2.  **Autenticação Hardcoded:**
    ```typescript
    headers: { 'X-goog-api-key': apiKey },
    ```
    Ollama e OpenAI usam `Authorization: Bearer <token>`.

3.  **Endpoint Específico do Gemini:**
    ```typescript
    const url = `${baseUrl}streamGenerateContent?alt=sse&key=${apiKey}`;
    ```
    Ollama usa `/v1/chat/completions`.

**Impacto:**
- A funcionalidade de **ATS Analysis** (Dashboard) **NÃO FUNCIONA** com Ollama ou OpenAI.
- Apenas a funcionalidade de **Parsing** (Editor) suporta múltiplos provedores (através das Server Actions).

---

## 4. Transparência na Interação LLM (Import)

A interface de importação (`/import`) é a principal área de interação do usuário com o LLM. A validação verificou se todas as etapas do processo são visíveis para o usuário.

### 4.1 Fluxo de Eventos no Import
O componente `ImportWizardClient.tsx` gerencia o estado visual da conversa (`parsingBubbles`, `analysisBubbles`).
Ele escuta eventos do stream da API:

1.  **`progress`**: Adiciona uma nova bolha de "loading" indicando que o sistema está trabalhando (ex: "Iniciando extração...", "Iniciando análise...").
2.  **`chunk`**: Atualiza a última bolha de AI com conteúdo parcial (simula digitação).
3.  **`complete`**: Armazena os dados finais e finaliza a etapa.
4.  **`error`**: Exibe uma mensagem de erro.

**Verificação:**
- A lógica de manipulação de eventos em `ImportWizardClient.tsx` está correta.
- O acumulo de texto (`aiMessage += data.content`) garante que o texto completo seja exibido.

### 4.2 Transparência nas API Routes
As rotas `/api/parse-resume` e `/api/analyze` foram verificadas para garantir que enviam os eventos esperados pelo frontend.

**Problema Identificado:**
- As rotas estavam **emitindo apenas eventos `chunk` e `complete`**.
- Falta o evento `progress` inicial, que informa ao usuário que o processamento começou.
- Sem o evento `progress`, a UI pode parecer "congelada" durante a extração de PDF ou análise.

**Correção Aplicada:**
- Adicionado `controller.enqueue(encoder.encode(...progress...))` no início do `ReadableStream` em ambas as rotas.
- Mensagens:
  - `/api/parse-resume`: "Iniciando extração de dados..."
  - `/api/analyze`: "Iniciando análise ATS..."

### 4.3 Transparência na Resposta do LLM
O LLM (Gemini, Ollama, OpenAI) é instruído a retornar **JSON válido**.
O frontend exibe o conteúdo do stream (`data.content`) diretamente na UI.
Isso significa que o usuário pode ver o JSON sendo "digitado" caractere por caractere.

**Impacto:**
- **Visível**: O usuário vê o progresso da geração do JSON.
- **Completo**: O JSON final é parseado corretamente pela função `robustJsonParse`.
- **Transparente**: A resposta bruta do LLM é visível, o que ajuda na depuração.

---

## 5. Correções Aplicadas

### 5.1 Correção para Ollama em `app/actions/ai.ts`
**Status:** ✅ Concluído

A função `getAIClient` foi modificada para verificar o `provider` antes de exigir `apiKey`.
- **Gemini**: Requer API Key (settings ou env var).
- **OpenAI/Ollama**: Usa `OpenAI` client compatível. Permite chave vazia para Ollama.
- **Default URLs**: Define URLs padrão baseadas no provedor (`http://host.docker.internal:11434/v1` para Ollama).

### 5.2 Correção para API Routes (`/api/analyze` e `/api/parse-resume`)
**Status:** ✅ Concluído

As rotas API foram refatoradas para usar `getAIClient` e suportar múltiplos provedores.
- **`app/api/analyze/route.ts`**: Agora usa `getAIClient` para obter a configuração. Suporta streaming para Gemini (fetch) e OpenAI/Ollama (SDK). Adicionado evento `progress` para transparência.
- **`app/api/parse-resume/route.ts`**: Refatorada para usar `getAIClient`. Suporta OpenAI/Ollama para entrada de texto/DOCX. Adicionado evento `progress` para transparência.
  - *Nota*: PDF parsing via API para OpenAI/Ollama é limitado (requer visão ou OCR externo). O fluxo ideal para PDFs continua via Server Action `parseResumeFromPDF`.

### 5.3 Verificação de Transparencia (Import)
**Status:** ✅ Concluído

Verificado o fluxo de eventos no `/import`:
- **Eventos suportados**: `progress`, `chunk`, `complete`, `error`.
- **Progresso visível**: O usuário vê "Iniciando extração..." e "Iniciando análise...".
- **Resposta visível**: O JSON da LLM é exibido caractere por caractere durante a geração.

### 5.4 Docker Compose (Opcional)
**Status:** Não modificado (sugestão mantida)

A sugestão de adicionar o serviço Ollama ao `docker-compose.yml` permanece válida para facilitar testes locais integrados.

---

## Conclusão

O sistema **não está validado** para uso com modelos locais (Ollama) ou OpenAI devido a bugs de autenticação e arquitetura inconsistente.
A correção do bug em `app/actions/ai.ts` é prioritária para permitir o uso básico de Ollama no editor.
A correção da rota `/api/analyze` é necessária para suportar Ollama/OpenAI no dashboard de ATS.
