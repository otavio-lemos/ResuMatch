# Plano de Teste - Modificações na Tela de Análise

## Visão Geral
Este documento descreve os casos de teste para validar as modificações implementadas na tela de análise do ResuMatch.

---

## Casos de Teste

### CT001 - Visualização de Bordas Retas
**Objetivo:** Verificar que todas as bordas na tela de análise são retas

**Passos:**
1. Acessar a página de análise de um currículo
2. Verificar visualmente todos os elementos

**Critérios de Aceitação:**
- [ ] Cards de Pillar (Design, Estrutura, Conteúdo) sem bordas arredondadas
- [ ] Seção de Score Principal sem bordas arredondadas
- [ ] Box de Sugestões sem bordas arredondadas
- [ ] Botões sem bordas arredondadas
- [ ] ONLY elementos CircularProgress devem ter formato circular

---

### CT002 - Sistema de Checkboxes nas Sugestões
**Objetivo:** Verificar funcionamento do sistema de seleção de sugestões

**Passos:**
1. Executar análise ATS
2. Localizar seção de Sugestões de Melhoria
3. Testar checkbox individual
4. Testar checkbox "Selecionar Todas"
5. Clicar em "Aplicar Selecionadas"

**Critérios de Aceitação:**
- [ ] Checkbox visível ao lado de cada sugestão
- [ ] Checkbox "Selecionar Todas" marca todos
- [ ] Botão "Aplicar Selecionadas" está presente
- [ ] Dropdown foi removido completamente

---

### CT003 - Label STAR
**Objetivo:** Verificar que o label está correto

**Passos:**
1. Acessar seção de Sugestões
2. Verificar texto do label

**Critérios de Aceitação:**
- [ ] Label exibe "Sugestão STAR" (não "Elite")

---

### CT004 - Nome do Campo Visível
**Objetivo:** Verificar que o nome do campo é exibido

**Passos:**
1. Acessar cards de pilares
2. Verificar se campo é identificado

**Critérios de Aceitação:**
- [ ] Card Design exibe "Design" como campo
- [ ] Card Estrutura exibe "Estrutura" como campo
- [ ] Card Conteúdo exibe "Conteúdo" como campo

---

### CT005 - Análise de Todos os Campos
**Objetivo:** Verificar que todos os campos são enviados para IA

**Passos:**
1. Criar currículo com múltiplas seções
2. Executar análise
3. Verificar resposta da API

**Critérios de Aceitação:**
- [ ] Seções inativas com conteúdo são analisadas
- [ ] Languages é enviado para análise
- [ ] Certifications é enviado para análise
- [ ] Volunteer é enviado para análise

---

### CT006 - Navegação no Cabeçalho
**Objetivo:** Verificar navegação consistente

**Passos:**
1. Acessar qualquer página
2. Verificar presença dos botões

**Critérios de Aceitação:**
- [ ] Botão "Análise" sempre presente
- [ ] Botão "Modelos" sempre presente
- [ ] Botão "Dashboard" sempre presente
- [ ] Botão "Config LLM" sempre presente
- [ ] Botão destacado quando na página correspondente

---

### CT007 - Botões por Página
**Objetivos específicos por página:**

**Página Análise:**
- [ ] Botão Editar presente
- [ ] Botão Importar presente  
- [ ] Botão Download presente

**Página Modelos:**
- [ ] Botão Novo presente
- [ ] Botão Importar presente

---

### CT008 - Toggle de Dados na Página de Modelos
**Objetivo:** Verificar funcionamento do toggle

**Passos:**
1. Acessar página de Modelos
2. Clicar em "Com Dados"
3. Selecionar modelo e criar
4. Verificar que foi criado COM dados
5. Retornar e clicar em "Sem Dados"
6. Criar modelo novamente
7. Verificar que foi criado SEM dados

**Critérios de Aceitação:**
- [ ] Toggle visível no header
- [ ] Estado muda entre "Com Dados" / "Sem Dados"
- [ ] Criar com dados inclui informações de exemplo
- [ ] Criar sem dados cria currículo vazio

---

### CT009 - Miniatura no Dashboard
**Objetivo:** Verificar miniatura realista

**Passos:**
1. Acessar dashboard com currículo
2. Visualizar miniatura

**Critérios de Aceitação:**
- [ ] Miniatura representa CV realisticamente
- [ ] Cabeçalho em destaque
- [ ] Linhas representando conteúdo
- [ ] Não está dentro de "caixa" - direto na página

---

### CT010 - Remoção da Segunda Barra de Cabeçalho
**Objetivo:** Verificar que não há duplicação

**Passos:**
1. Acessar página de análise
2. Verificar header

**Critérios de Aceitação:**
- [ ] Apenas um header presente
- [ ] Não há segunda barra com nome do candidato
- [ ] Nome do candidato não aparece duplicado

---

### CT011 - Navegação Dots no Dashboard
**Objetivo:** Verificar comportamento correto

**Passos:**
1. Acessar dashboard com múltiplos currículos
2. Clicar nos dots de navegação

**Critérios de Aceitação:**
- [ ] Dots não têm animação de transição
- [ ] Clicar muda o currículo atual

---

## Execução de Testes

### Comando para executar todos os testes:
```bash
npm test
```

### Testes E2E (Playwright):
```bash
npx playwright test
```

---

## Bugs Conhecidos a Verificar

1. ✅ Bordas arredondadas restantes em algum elemento
2. ✅ Checkbox não está aplicando corretamente
3. ✅ Toggle de dados não está funcionando
4. ✅ Miniatura não está renderizando corretamente

---

*Documento atualizado em: 2026-03-04*
