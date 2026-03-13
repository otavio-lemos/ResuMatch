# Dashboard Resume Selector Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar seletor de currículo no dashboard com nome aleatório + ações de tradução/duplicação/exclusão, usando dados ATS existentes para análise.

**Architecture:** Modificar DashboardContent.tsx existente para adicionar seletor de currículo, mover ações para dropdown, usar detailedSuggestions filtrado por tipo para categorias de análise.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS

---

## Chunk 1: Traduções

### Task 1: Adicionar traduções para ações do currículo

**Files:**
- Modify: `lib/translations.ts:217-230` (pt) e `lib/translations.ts:710-730` (en)

- [ ] **Step 1: Adicionar traduções em pt**

Procurar `dashboard:` em pt e adicionar:
```typescript
translateResume: "Traduzir Currículo",
duplicateResume: "Duplicar Currículo", 
deleteResume: "Excluir Currículo",
```

- [ ] **Step 2: Adicionar traduções em en**

Procurar `dashboard:` em en e adicionar:
```typescript
translateResume: "Translate Resume",
duplicateResume: "Duplicate Resume",
deleteResume: "Delete Resume",
```

- [ ] **Step 3: Commit**

```bash
git add lib/translations.ts
git commit -m "feat: add resume action translations"
```

---

## Chunk 2: Geração de resumeCode

### Task 2: Gerar resumeCode na criação do currículo

**Files:**
- Modify: `app/api/resumes/route.ts:143`

- [ ] **Step 1: Adicionar função de geração de resumeCode**

Adicionar helper function no início do arquivo:
```typescript
function generateResumeCode(language: string): string {
  const number = Math.floor(1000 + Math.random() * 9000);
  const suffix = language === 'en' ? 'USA' : 'BRA';
  return `${number}${suffix}`;
}
```

- [ ] **Step 2: Adicionar resumeCode na criação**

Modificar `finalData` para incluir:
```typescript
const finalData: any = {
  resumeCode: generateResumeCode(language),
  // ... rest of data
};
```

- [ ] **Step 3: Commit**

```bash
git add app/api/resumes/route.ts
git commit -m "feat: generate resumeCode on creation"
```

---

## Chunk 3: Storage e API

### Task 3: Atualizar storage para incluir resumeCode

**Files:**
- Modify: `lib/storage/resume-storage.ts`

- [ ] **Step 1: Verificar estrutura atual do storage**

Ler as linhas 30-50 do arquivo para entender o modelo de dados.

- [ ] **Step 2: Adicionar resumeCode ao modelo**

Se necessário, adicionar campo `resumeCode` na interface de dados.

- [ ] **Step 3: Commit**

```bash
git add lib/storage/resume-storage.ts
git commit -m "feat: add resumeCode to storage model"
```

### Task 4: Atualizar API GET /api/resumes

**Files:**
- Modify: `app/api/resumes/route.ts:153-160`

- [ ] **Step 1: Verificar retorno atual da listagem**

A listagem atual já deve retornar todos os campos do currículo. Confirmar que `resumeCode` está sendo retornado.

- [ ] **Step 2: Commit se necessário**

---

## Chunk 4: DashboardContent - Estrutura

### Task 5: Modificar DashboardContent para usar resumeCode

**Files:**
- Modify: `components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Ler arquivo atual completo**

```bash
# O arquivo tem ~700+ linhas, ler todo para entender estrutura
```

- [ ] **Step 2: Identificar código do dropdown de workspace**

Procurar por "workspace" ou "dropdown" no arquivo (lines ~306-319).

- [ ] **Step 3: Substituir dropdown de workspace por seletor de currículo**

Manter estilo similar mas usar `resumeCode` dos dados:
```typescript
// Novo seletor
const resumeOptions = resumes.map(r => ({
  id: r.id,
  label: r.resumeCode || r.id
}));
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DashboardContent.tsx
git commit -m "feat: replace workspace dropdown with resume selector"
```

---

## Chunk 5: DashboardContent - Ações

### Task 6: Adicionar ações no dropdown

**Files:**
- Modify: `components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Adicionar menu de ações**

Após o seletor de currículo, adicionar menu dropdown com:
- "Traduzir Currículo" - chama função de tradução
- "Duplicar Currículo" - chama API de duplicação  
- "Excluir Currículo" - chama API de exclusão com confirmação

- [ ] **Step 2: Implementar funções de ação**

```typescript
const handleTranslate = async () => {
  // Chamar API para traduzir
};

const handleDuplicate = async () => {
  // Chamar API para duplicar
};

const handleDelete = async () => {
  // Chamar API para deletar com confirmação
};
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardContent.tsx
git commit -m "feat: add translate/duplicate/delete actions to dropdown"
```

---

## Chunk 6: Análise ATS

### Task 7: Usar detailedSuggestions para categorias de análise

**Files:**
- Modify: `components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Identificar seção de checks de análise**

Procurar por "checks" ou as seções de Design/Estrutura/Conteúdo.

- [ ] **Step 2: Modificar para usar detailedSuggestions filtrado**

```typescript
// Filtrar suggestions por tipo
const designChecks = data.aiAnalysis?.detailedSuggestions?.filter(s => s.type === 'design') || [];
const structureChecks = data.aiAnalysis?.detailedSuggestions?.filter(s => s.type === 'estrutura') || [];
const contentChecks = data.aiAnalysis?.detailedSuggestions?.filter(s => s.type === 'conteudo') || [];
```

- [ ] **Step 3: Renderizar checks filtrados em cada categoria**

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DashboardContent.tsx
git commit -m "feat: use detailedSuggestions for analysis categories"
```

---

## Chunk 7: Remoções

### Task 8: Remover botão "Ver Análise Completa"

**Files:**
- Modify: `components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Identificar código do botão**

Procurar por "Ver Análise Completa" ou "viewFullAnalysis" (lines ~622-630).

- [ ] **Step 2: Remover botão**

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardContent.tsx
git commit -m "feat: remove 'Ver Análise Completa' button"
```

---

## Chunk 8: Testes

### Task 9: Testar fluxo completo

- [ ] **Step 1: Criar currículo e verificar resumeCode**

Acessar /modelos, criar currículo, verificar se nome aparece como "XXXXUSA" ou "XXXXBRA".

- [ ] **Step 2: Testar seleção**

Selecionar diferentes currículos no dropdown.

- [ ] **Step 3: Testar ações**

- Tradução: verificar mudança de idioma
- Duplicação: verificar novo currículo criado
- Exclusão: verificar remoção com confirmação

- [ ] **Step 4: Testar análise ATS**

Verificar que Design/Estrutura/Conteúdo mostram dados corretos de detailedSuggestions.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify resume selector functionality"
```

---

## Summary

Total de tarefas: 9 tasks divididas em 8 chunks

Arquivos principais modificados:
- `lib/translations.ts` - traduções
- `app/api/resumes/route.ts` - geração resumeCode
- `lib/storage/resume-storage.ts` - modelo de dados
- `components/dashboard/DashboardContent.tsx` - UI principal
