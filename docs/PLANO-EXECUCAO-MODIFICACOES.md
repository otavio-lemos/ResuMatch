# PLANO DE EXECUÇÃO CIRÚRGICO - MODIFICAÇÕES SOLICITADAS

## ANÁLISE PRÉVIA
- **Arquivos identificados**: 6 arquivos principais
- **Ondas de execução**: 4 ondas sequenciais
- **Foco cirúrgico**: Apenas o que foi solicitado

## PLANO DE EXECUÇÃO

### ONDA 1: REMOÇÕES (Arquivo: components/dashboard/DashboardContent.tsx)
**Tarefas:**
1. Remover texto "AUDITADO 2025" (não encontrado - verificar localização exata)
2. Remover texto "pontuação ATS GERAL" do arquivo app/actions/ai.ts:101
   - Alterar: `Execute a Fase 2: Auditoria (ATS Scoring) GERAL conforme o SKILL.md`
   - Para: `Execute a Fase 2: Auditoria (ATS Scoring) conforme o SKILL.md`

### ONDA 2: ALTERAÇÕES DE TEXTO (Arquivo: components/dashboard/DashboardContent.tsx)
**Tarefas:**
1. Alterar texto sobre avaliação técnica - localizar exato ponto de alteração
   - Buscar por textos como "avaliação técnica", "análise", "scoring"

### ONDA 3: ADIÇÕES (Arquivo: components/dashboard/DashboardContent.tsx)
**Tarefas:**
1. Adicionar botão "SCORE ATS | BENCHMARKING DE VAGA" com bordas retas
   - Localizar área apropriada (próximo ao score geral ou CTA)
   - Aplicar classe CSS para bordas retas: `rounded-none`

### ONDA 4: BORDAS RETAS (Todos os 6 arquivos)
**Arquivos e aplicações:**
1. **components/dashboard/DashboardContent.tsx** - Já será feito na onda 3
2. **components/dashboard/ATSAnalysisView.tsx** - Aplicar `rounded-none` em todos os containers principais
3. **app/analisar/page.tsx** - Aplicar `rounded-none` em elementos visíveis
4. **app/dashboard/page.tsx** - Aplicar `rounded-none` em elementos visíveis
5. **app/page.tsx** - Aplicar `rounded-none` em elementos visíveis
6. **components/dashboard/DashboardContent.tsx** - Concluir aplicação

## ORDEM DE EXECUÇÃO
1. **Onda 1** - Remoções (sequencial)
2. **Onda 2** - Alterações de texto (sequencial)
3. **Onda 3** - Adições (sequencial)
4. **Onda 4** - Bordas retas (pode ser feita em paralelo para os 5 arquivos)

## PONTOS DE ATENÇÃO
- **AUDITADO 2025** - Não encontrado, precisa localização exata
- **Avaliação técnica** - Texto específico precisa ser identificado
- **Botão SCORE ATS** - Definir posição estratégica no layout
- **Bordas retas** - Verificar quais elementos já têm bordas arredondadas

## VALIDAÇÃO
- Após cada onda: testar funcionalidade
- Após onda 4: validar design em todos os arquivos