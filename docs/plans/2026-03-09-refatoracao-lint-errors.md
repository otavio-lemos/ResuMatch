# Refatoração -Lint Errors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refatorar os lint errors identificados no código para seguir melhores práticas do React

**Architecture:** Analisar cada lint error e determinar se é necessário (padrão do React) ou se pode ser refatorado para evitar chamadas de setState dentro de useEffect

**Tech Stack:** React, Next.js, ESLint

---

### Task 1: Analisar ThemeToggle.tsx - Manter código existente

**Files:**
- `components/ThemeToggle.tsx:10-18`

**Análise:**
O lint error na linha 13 é **NECESSÁRIO** porque:
- `localStorage` não existe no servidor (SSR)
- Este é o padrão recomendado para hydration safe theme initialization
- Não há alternativa simples sem refatoração significativa

**Decisão:** MANTER como está - é um padrão aceito

---

### Task 2: Refatorar ATSAnalysisView.tsx - Linha 286 (setSuggestions)

**Files:**
- Modify: `components/dashboard/ATSAnalysisView.tsx:283-335`
- Modify: `components/dashboard/ATSAnalysisView.tsx:276`

**Step 1: Transformar useEffect em useMemo**

Substituir useState + useEffect por useMemo derivado

**Step 2: Testar se funciona**

Run: `npm run lint`

**Step 3: Commit**

---

### Task 3: Refatorar ATSAnalysisView.tsx - Linha 339 (setSelectAll)

**Files:**
- Modify: `components/dashboard/ATSAnalysisView.tsx:337-341`
- Modify: `components/dashboard/ATSAnalysisView.tsx:278`

**Step 1: Remover useEffect e derivar no render**

**Step 2: Testar**

Run: `npm run lint`

**Step 3: Commit**

---

## Resumo

| Task | Arquivo | Decisão |
|------|---------|---------|
| 1 | ThemeToggle.tsx | MANTER - padrão necessário |
| 2 | ATSAnalysisView.tsx:286 | REFATORAR - useMemo |
| 3 | ATSAnalysisView.tsx:339 | REFATORAR - derivar no render |
