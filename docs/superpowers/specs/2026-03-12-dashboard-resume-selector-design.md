# Design: Dashboard com Seletor de Currículo

**Data:** 2026-03-12  
**Status:** Aprovado

---

## 1. Visão Geral

Este documento descreve as mudanças no dashboard do ResuMatch para:

1. Remover o dropdown de workspace existente
2. Adicionar dropdown de seleção de currículo no topo (com nome aleatório + idioma)
3. Mover ações do workspace para o dropdown do currículo selecionado
4. Remover botão "Ver Análise Completa"
5. Usar dados ATS existentes para as categorias de análise

---

## 2. Estrutura de Dados

### 2.1 Nome do Currículo (resumeCode)

O nome do currículo será gerado na criação e persistido:

```typescript
// Generation logic
const generateResumeCode = (language: 'pt' | 'en'): string => {
  const number = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  const suffix = language === 'en' ? 'USA' : 'BRA';
  return `${number}${suffix}`;
};

// Example: "1923USA", "1343BRA"
```

- Campo: `resumeCode: string` no modelo de dados do currículo
- Gerado uma única vez na criação
- Armazenado junto com os dados do currículo

### 2.2 Dados de Análise

As categorias de análise usarão `detailedSuggestions` existente filtrado por tipo:

- **Design Visual:** `detailedSuggestions.filter(s => s.type === 'design')`
- **Estrutura do Currículo:** `detailedSuggestions.filter(s => s.type === 'estrutura')`
- **Qualidade do Conteúdo:** `detailedSuggestions.filter(s => s.type === 'conteudo')`

---

## 3. Componentes UI

### 3.1 Dropdown de Seleção de Currículo

**Posição:** No topo da página, ao lado esquerdo do botão Dashboard

**Estilo:** Mesmo padrão dos botões existentes no navbar

**Itens do dropdown:**
- Lista de todos os currículos com `resumeCode` (ex: "1923 USA", "1343 BRA")
- Ao selecionar, carrega os dados daquele currículo

### 3.2 Ações no Dropdown

Relativas ao currículo selecionado:

| Ação | Descrição |
|------|-----------|
| Traduzir Currículo | Converte entre pt↔en |
| Duplicar Currículo | Cria cópia com novo resumeCode |
| Excluir Currículo | Remove (com confirmação) |

### 3.3 Remoções

- **Dropdown de workspace:** Remover código existente (lines 306-319 de DashboardContent.tsx)
- **Botão "Ver Análise Completa":** Remover (lines 622-630 de DashboardContent.tsx)

---

## 4. Traduções

Adicionar em `lib/translations.ts`:

```typescript
// pt
dashboard: {
  // ... existing keys
  translateResume: "Traduzir Currículo",
  duplicateResume: "Duplicar Currículo",
  deleteResume: "Excluir Currículo",
}

// en
dashboard: {
  // ... existing keys
  translateResume: "Translate Resume",
  duplicateResume: "Duplicate Resume",
  deleteResume: "Delete Resume",
}
```

---

## 5. Fluxo de Dados

1. **Criação:** Gerar `resumeCode` ao criar novo currículo via API
2. **Listagem:** `/api/resumes` retorna lista com `resumeCode` 
3. **Seleção:** Dropdown permite trocar entre currículos
4. **Ações:** Operam no currículo atualmente selecionado

---

## 6. Análise ATS (Design/Estrutura/Conteúdo)

As seções de análise usarão dados de `aiAnalysis.detailedSuggestions`:

### Design Visual
- Tipo: `type === 'design'`
- Exemplos: ícones, textbox, colunas

### Estrutura do Currículo
- Tipo: `type === 'estrutura'`
- Exemplos: smartquotes, datas, headers

### Qualidade do Conteúdo
- Tipo: `type === 'conteudo'`
- Exemplos: verbos de ação, métricas

Cada seção exibirá os checks e sugestões correspondentes filtrados.

---

## 7. Arquivos Envolvidos

| Arquivo | Mudança |
|---------|---------|
| `lib/translations.ts` | Adicionar traduções |
| `app/api/resumes/route.ts` | Gerar resumeCode na criação |
| `lib/storage/resume-storage.ts` | Incluir resumeCode no modelo |
| `components/dashboard/DashboardContent.tsx` | Remover workspace dropdown, usar detailedSuggestions |
| `store/useResumeStore.ts` | Suporte para resumeCode |

---

## 8. Implementação Recomendada

1. Adicionar traduções primeiro
2. Modificar API de criação para gerar resumeCode
3. Atualizar storage para persistir resumeCode
4. Modificar DashboardContent para:
   - Remover dropdown de workspace
   - Adicionar seletor de currículo no topo
   - Usar detailedSuggestions filtrado por tipo
5. Remover botão "Ver Análise Completa"
6. Testar fluxo completo
