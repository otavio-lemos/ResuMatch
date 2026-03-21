# Correção Completa da Geração de PDF - Plano de Implementação

> **Para agentes:** Execute este plano usando a skill superpowers:subagent-driven-development

**Meta:** Corrigir a geração de PDF para que todo o conteúdo do currículo apareça (não apenas informações pessoais + resumo)

**Arquitetura:** O sistema atual usa `react-to-print` para abrir a janela de impressão do navegador. O problema é que apenas conteúdo parcial aparece. A solução envolve múltiplas camadas: timing de dados, CSS de impressão, e debug do contentRef.

**Stack:** Next.js 14, React, react-to-print v3.3.0, Tailwind CSS

---

## Diagnóstico do Problema

Após análise do código, os problemas potenciais identificados são:

1. **Timing Issue (page.tsx:53-61)**: O `setTimeout` de 500ms pode não ser suficiente para carregar todos os dados antes de imprimir
2. **CSS de Impressão (globals.css:26-28)**: Elementos com `display: none !important` podem estar escondendo conteúdo
3. **Dynamic Import (page.tsx:11-14)**: O ResumePreview é carregado dinamicamente com SSR=false, pode haver race condition
4. **React-to-print ref**: O contentRef pode não estar apontando corretamente para todo o conteúdo

---

## Chunk 1: Debug e Identificação da Causa Raiz

### Task 1: Adicionar Logging para Debug

**Arquivos:**
- Modificar: `app/editor/[id]/page.tsx`

```typescript
// No useEffect que dispara o print, adicionar logging
useEffect(() => {
  if (shouldPrint && data && reactToPrintFn) {
    console.log('[PRINT DEBUG] Data loaded:', !!data);
    console.log('[PRINT DEBUG] Data sections:', data.sectionsConfig?.length);
    console.log('[PRINT DEBUG] Data experiences:', data.experiences?.length);
    console.log('[PRINT DEBUG] Data education:', data.education?.length);
    console.log('[PRINT DEBUG] Data skills:', data.skills?.length);
    console.log('[PRINT DEBUG] ContentRef:', contentRef.current);
    console.log('[PRINT DEBUG] ContentRef children:', contentRef.current?.children.length);
    
    const timer = setTimeout(() => {
      console.log('[PRINT DEBUG] Executing print...');
      reactToPrintFn();
      router.replace(`/editor/${resolvedParams.id}`);
    }, 1000); // Aumentar para 1 segundo
    
    return () => clearTimeout(timer);
  } else if (shouldPrint && !data) {
    console.log('[PRINT DEBUG] Data NOT loaded when print triggered!');
  }
}, [shouldPrint, data, reactToPrintFn, router, resolvedParams.id]);
```

- [ ] **Step 1: Aplicar a mudança acima**

- [ ] **Step 2: Testar a impressão e verificar os logs no console**

Execute: `npm run dev` e teste o download do PDF. Verifique os logs no console do navegador.

**Esperado:** Verificar se os dados estão sendo carregados corretamente antes do print

---

### Task 2: Verificar Estrutura do DOM de Impressão

**Arquivos:**
- Modificar: `app/editor/[id]/page.tsx`

```typescript
// Adicionar função para inspecionar o conteúdo antes de imprimir
const debugPrintContent = useCallback(() => {
  if (contentRef.current) {
    const container = contentRef.current;
    console.log('[DOM DEBUG] Container HTML:', container.innerHTML.substring(0, 500));
    console.log('[DOM DEBUG] All children:');
    Array.from(container.children).forEach((child, i) => {
      console.log(`  Child ${i}:`, child.className, child.tagName);
    });
  }
}, []);

useEffect(() => {
  // Adicionar após loadLocalResume
  if (data) {
    setTimeout(debugPrintContent, 800);
  }
}, [data, debugPrintContent]);
```

- [ ] **Step 1: Adicionar debugging do DOM**

- [ ] **Step 2: Verificar se todas as seções estão no DOM antes de imprimir**

---

## Chunk 2: Correção de Timing e Carregamento de Dados

### Task 3: Corrigir Timing de Impressão

**Arquivos:**
- Modificar: `app/editor/[id]/page.tsx`

O problema pode ser que o print está sendo chamado antes dos dados estarem completamente disponíveis no DOM.

```typescript
// Substituir o useEffect atual por versão mais robusta
useEffect(() => {
  if (shouldPrint && data && reactToPrintFn) {
    // Aguardar próximo render cycle para garantir que tudo está no DOM
    const waitForRender = () => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100); // Aguardar 100ms após render
        });
      });
    };

    const executePrint = async () => {
      await waitForRender();
      
      // Verificar se o conteúdo está pronto
      if (contentRef.current?.querySelector('.resume-container')) {
        console.log('[PRINT] Content ready, executing print');
        await reactToPrintFn();
      } else {
        console.error('[PRINT] Resume container not found!');
      }
      
      // Remover query param sem recarregar
      router.replace(`/editor/${resolvedParams.id}`, { scroll: false });
    };

    executePrint();
  }
}, [shouldPrint, data, reactToPrintFn, router, resolvedParams.id]);
```

- [ ] **Step 1: Aplicar a correção de timing**

- [ ] **Step 2: Testar e verificar se todo o conteúdo aparece**

---

### Task 4: Forçar Reflow Antes da Impressão

**Arquivos:**
- Modificar: `app/editor/[id]/page.tsx`

Às vezes o navegador precisa de um trigger para recalcular o layout.

```typescript
// Adicionar no useReactToPrint options
const reactToPrintFn = useReactToPrint({ 
  contentRef,
  onBeforePrint: async () => {
    console.log('[PRINT] onBeforePrint called');
    // Forçar reflow
    if (contentRef.current) {
      contentRef.current.offsetHeight; // Trigger reflow
    }
  },
  onAfterPrint: () => {
    console.log('[PRINT] onAfterPrint called');
    router.replace(`/editor/${resolvedParams.id}`, { scroll: false });
  },
});
```

- [ ] **Step 1: Adicionar callbacks de debug e forçar reflow**

- [ ] **Step 2: Remover o useEffect de print antigo (se redundante)**

---

## Chunk 3: Correção de CSS de Impressão

### Task 5: Auditar CSS de Impressão

**Arquivos:**
- Modificar: `app/globals.css`

O globals.css atual tem regras que podem estar escondendo conteúdo:

```css
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
    background: white !important;
  }

  /* PROBLEMA: Esto está escondendo elementos demais! */
  header, footer, nav, aside, button, .no-print, .page-break-indicator {
    display: none !important;
  }

  * {
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* Adicionar: Garantir que o conteúdo de impressão seja visível */
  #resume-print-container {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Garantir que todas as seções sejam visíveis */
  .resume-container section,
  .resume-container div {
    display: block !important;
    visibility: visible !important;
  }
}
```

- [ ] **Step 1: Aplicar as correções de CSS**

- [ ] **Step 2: Testar impressão**

---

### Task 6: Verificar CSS do ResumePreview

**Arquivos:**
- Modificar: `components/editor/ResumePreview.tsx:1532-1558`

O componente tem styles inline que podem interferir:

```typescript
return (
    <div className="relative overflow-visible">
        {/* Remover overflow:hidden de pais se existir */}
        <style dangerouslySetInnerHTML={{
            __html: `
            .resume-container {
                width: ${printWidth} !important;
                max-width: ${printWidth} !important;
                margin: 0 auto !important;
                padding: 10mm !important;
                min-height: ${pageMinHeight} !important;
                page-break-inside: avoid;
                box-sizing: border-box;
                background: white;
                overflow: visible !important; /* ADICIONAR */
            }
            @media print {
                @page {
                    size: ${pageSizeCSS};
                    margin: 10mm;
                }
                html, body {
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                }
                .page-break-indicator { display: none !important; }
                
                /* Garantir visibilidade total */
                .resume-container {
                    overflow: visible !important;
                    height: auto !important;
                }
            }
            `
        }} />

        {renderTemplate()}
    </div>
);
```

- [ ] **Step 1: Aplicar correção de overflow no ResumePreview**

- [ ] **Step 2: Testar impressão**

---

## Chunk 4: Solução Alternativa - Impressão Direta com Callback

### Task 7: Adicionar Opção de Impressão com Callback Detalhado

**Arquivos:**
- Modificar: `app/editor/[id]/page.tsx`

Se as correções acima não funcionarem, usar callbacks mais robustos:

```typescript
const reactToPrintFn = useReactToPrint({ 
  contentRef,
  onBeforePrint: async () => {
    console.log('[PRINT] Preparing to print...');
    
    // Garantir que todos os dados estão disponíveis
    const content = contentRef.current;
    if (!content) {
      throw new Error('Content ref is null');
    }
    
    // Verificar elementos esperados
    const resumeContainer = content.querySelector('.resume-container');
    if (!resumeContainer) {
      console.error('[PRINT] Resume container not found!');
      // Tentar encontrar qualquer elemento de currículo
      const sections = content.querySelectorAll('section, div');
      console.log('[PRINT] Available sections:', sections.length);
    } else {
      console.log('[PRINT] Resume container found');
      console.log('[PRINT] Container innerHTML length:', resumeContainer.innerHTML.length);
    }
    
    return Promise.resolve();
  },
  onAfterPrint: () => {
    console.log('[PRINT] Print completed');
    // Usar replace em vez de push para não criar histórico extra
    window.history.replaceState(null, '', `/editor/${resolvedParams.id}`);
  },
  onPrintError: (errorLocation, error) => {
    console.error('[PRINT] Print error:', errorLocation, error);
  },
  suppressErrors: false,
});
```

- [ ] **Step 1: Implementar com callbacks de erro**

- [ ] **Step 2: Testar e verificar logs**

---

## Chunk 5: Debug Avançado - Teste de Conteúdo

### Task 8: Criar Componente de Debug Visual

**Arquivos:**
- Criar: `components/editor/PrintDebug.tsx`

```typescript
'use client';

import { useResumeStore } from '@/store/useResumeStore';

export function PrintDebug() {
  const data = useResumeStore(state => state.data);
  
  if (!data) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: 10,
      fontSize: 12,
      zIndex: 9999,
    }}>
      <h4>Debug Info:</h4>
      <div>Template: {data.templateId}</div>
      <div>Sections Config: {data.sectionsConfig?.length || 0}</div>
      <div>Active Sections: {data.sectionsConfig?.filter(s => s.active).length || 0}</div>
      <div>Experiences: {data.experiences?.length || 0}</div>
      <div>Education: {data.education?.length || 0}</div>
      <div>Skills: {data.skills?.length || 0}</div>
    </div>
  );
}
```

- [ ] **Step 1: Criar componente de debug**

- [ ] **Step 2: Adicionar ao editor page temporariamente para debug**

- [ ] **Step 3: Testar e verificar se todos os dados estão disponíveis**

---

## Chunk 6: Verificação Final e Limpeza

### Task 9: Verificação de Impressão Completa

**Ações:**
- [ ] Testar com diferentes templates (classic, modern, tech, etc.)
- [ ] Testar com currículos com muito conteúdo (múltiplas páginas)
- [ ] Testar em diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Verificar que todas as seções aparecem: personal info, summary, experience, education, skills, custom sections

### Task 10: Remover Código de Debug

**Arquivos:**
- Limpar: `app/editor/[id]/page.tsx`
- Limpar: `app/globals.css` (se adicionou debug styles)
- Remover: `components/editor/PrintDebug.tsx` (se criado)

**Ações:**
- [ ] Remover todos os console.log de debug
- [ ] Remover componentes de debug
- [ ] Restaurar timeout original (500ms ou 1000ms)

---

## Ordens de Execução Recomendadas

1. **Primeiro**: Task 1 e 2 (Debugging) - para entender exatamente o que está acontecendo
2. **Segundo**: Task 3 e 4 (Timing) - geralmente resolve o problema
3. **Terceiro**: Task 5 e 6 (CSS) - se timing não resolver
4. **Quarto**: Task 7 e 8 - se necessário
5. **Último**: Task 9 e 10 - verificação e limpeza

---

## Referências

- [react-to-print GitHub](https://github.com/gregnb/react-to-print)
- [Documentação MDN - @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/@media)
- [CSS Print Color Adjust](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust)
