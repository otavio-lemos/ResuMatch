---
name: ats-auditor
description: Especialista em auditoria ATS, pontuação e análise de compatibilidade com sistemas de rastreamento de candidatos.
allowed-tools: Read, Write, Edit
---

# ATS Auditor Skill (Audit Phase)

> Habilidade dedicada à auditoria de currículos: análise de pontuação ATS, validação de formatos e compatibilidade com sistemas como Workday, Taleo, Greenhouse.

---

########## AAAUUUDDDIIITTTOOORRRIIIAAA
## 2. Fase de Auditoria (Pontuação ATS)

Quando a tarefa for auditar um currículo já estruturado em JSON, a avaliação deve seguir EXATAMENTE os padrões de mercado ATS 2026 baseados em pesquisas com os maiores sistemas: Workday, Greenhouse, iCIMS, Taleo, Lever, SmartRecruiters.

### ⚠️ REGRA CRÍTICA: ANALISE TODOS OS CAMPOS
- **OBRIGATÓRIO:** Analise ABSOLUTAMENTE TODOS os campos existentes e preenchidos
- Não ignore nenhuma seção existente
- Se um campo tem conteúdo, ele deve ser analisado com as regras específicas ATS

### PILARES DE AVALIAÇÃO (Padrão de Mercado 2026)

#### 1. DESIGN (0-100 pts)
Foco: Legibilidade mecânica (OCR/parsing)

| Regra | Problema | Impacto no Score |
|-------|----------|--------------|
| Fontes padrão | Não usar: Watermark, Brush, Comic, fontes decorativas | -20 |
| Fontes padrão | Deve usar: Arial, Calibri, Times New Roman, Garamond | -15 se não for padrão |
| Layout coluna única | Multi-colunas causam falha de parse (Taleo = zero) | -30 |
| Sem tabelas em skills | Tabelas = texto não indexado | -25 |
| Sem gráficos/barras | Elementos visuais não são lidos | -15 |
| Sem headers/footers | Taleo ignora, Workday pula - info no corpo | -20 |
| Sem text boxes | Taleo ignora completamente | -25 |
| Sem ícones/emoji | Workday lê como garbage characters | -25 |
| Apenas PDF/DOCX | Imagens = não lidas | -10 |
| Arquivo <5MB | iCIMS recomenda | -5 |

#### 2. ESTRUTURA (0-100 pts)
Foco: Parse correto das seções

| Regra | Problema | Impacto no Score |
|-------|----------|--------------|
| Datas MM/AAAA | YYYY-MM, YYYY-MM-DD não parseados corretamente | -25 |
| Cabeçalhos padrão | "Exp Prof" vs "Experiência Profissional" | -15 |
| Seções obrigatórias | Ausência de Resumo, Experiência, Formação, Skills | -20 |
| Info de contato | Email, fone, local devem estar parseáveis | -15 |
| Smart quotes | “ ” vs " " - Taleo quebra | -15 |
| Em-dashes | — vs - quebram em alguns ATS | -10 |
| Hobbies/Interesses | Ruído que dilui palavras-chave | -10 |
| Foto | Em alguns ATS causa rejeição (GDPR) | -5 |

#### 3. CONTEÚDO (0-100 pts)
Foco: Densidade de keywords e método STAR

| Métrica | Ideal | Problema se |
|--------|-------|-------------|
| Contagem palavras | 330-573 | <300 ou >800 |
| Bullets por exp | 4-7 | <2 ou >10 |
| Bullets com STAR | >70% | <30% |
| Keywords (sem JD) | 15-25 | <10 ou >50 |
| Keywords (com JD) | 25-35 (para >80% match) | <20 |
| Keywords embutidas | iCIMS extrai de TODO texto, não só Skills | Bônus |
| Comprimento páginas | 1 (estagiário), 2 (pleno/sênior), 3 (executivo) | +1 página = -10 |

### VALIDAÇÕES ESPECÍFICAS (Baseado em resumegeni.com 2026)

#### A) FORMATO DE ARQUIVO
- **Taleo**: Prefere DOCX sobre PDF
- **Workday, iCIMS, Greenhouse**: PDF é seguro
- **Recomendação**: Para envios genéricos, use PDF

#### B) HEADERS/FOOTERS (Crítico para Taleo e Workday)
- Taleo ignora cabeçalhos/rodapés completamente
- Workday frequentemente pula informações em cabeçalhos
- **Regra**: Todas as informações de contato devem estar no corpo do documento
- Feedback: "Informações de contato detectadas em cabeçalho/rodapé. Mova para o corpo do documento."

#### C) ÍCONES E EMOJIS (Crítico para Workday)
- Workday lê ícones como garbage characters (📞, ✉️, etc)
- **Regra**: Use texto "Telefone:", "Email:", "LinkedIn:" em vez de ícones
- Feedback: "Ícones detectados. Substitua '📞' por 'Telefone:', '✉️' por 'Email:'."

#### D) CARACTERES ESPECIAIS
- **Smart quotes** (" ") → converter para aspas retas (")
- **Em-dashes** (—) → converter para hífen (-)
- **Caracteres não-ASCII** → evitar para Taleo
- Feedback: "Smart quotes detectadas. Converta para aspas retas."

#### E) TEXT BOXES (Taleo = ignorar completamente)
- Qualquer conteúdo dentro de caixas de texto é ignorado
- Feedback: "Conteúdo em caixa de texto detectado (Taleo ignora). Remova caixas de texto."

#### F) LAYOUT DE COLUNAS
| ATS | Tolerância |
|-----|------------|
| Taleo | NENHUMA - apenas coluna única |
| Workday | Limitada |
| iCIMS | Razoável |
| Greenhouse | Boa |
| Lever | Boa |

- Feedback: "Layout de múltiplas colunas detectado. O Taleo não suporta. Use coluna única."

#### G) FONTES PADRÃO
- **Taleo**: Arial, Calibri, Times New Roman apenas
- **Outros**: Qualquer fonte legível
- Feedback: "Fonte não padrão detectada. Use Arial, Calibri ou Times New Roman para máxima compatibilidade ATS."

### VALIDAÇÕES DE DATAS ESPECÍFICAS (CRÍTICO)

**Datas fora do padrão MM/AAAA:**
- Formatos inválidos: YYYY-MM, YYYY-MM-DD, DD/MM/AAAA, apenas ano
- Para cada data fora do padrão: -15 pontos em Estrutura
- Feedback: "Use MM/AAAA (ex: 10/2021 - 12/2024). O formato atual [formato] não é parseado corretamente."

**Experiências antigas (>5 anos do ano atual 2026):**
- Experiências iniciadas há mais de 5 anos devem ser sinalizadas
- Se >10 anos: considerar remover ou resumir em 1-2 bullets
- Feedback para >10 anos: "Experiência de [ANO] há mais de 10 anos. Considere remover ou resumir para focar em marcos mais recentes e relevantes."

### VALIDAÇÕES DE CERTIFICAÇÕES

**Certificações expiradas:**
- Verificar se expirationDate existe e está no passado (2026-03)
- Se expirada e <3 anos: sinalizar "(expired)"
- Se expirada e >3 anos: recomendar remoção ou mover para "Certificações Legadas"
- Feedback: "Certificação [NOME] expirou em [DATA]. Considere: (1) Remover, (2) Listar como '[NOME] (expired [DATA])', ou (3) Adicionar data de renovação"

### VALIDAÇÕES DE KEYWORDS

**Densidade de Palavras-chave:**
- Contagem de palavras-chave únicas do currículo
- Contagem de palavras-chave da JD (se fornecida)
- Taxa de match = (encontradas / total JD keywords) * 100
- >80% = excelente, 60-80% = bom, <60% = precisa melhorar

**Keywords Embutidas (vantagem iCIMS):**
- iCIMS extrai palavras-chave de TODO o texto, não apenas da seção Skills
- Encorajar embutir palavras-chave nos bullets de experiência
- Feedback: "Palavras-chave detectadas em bullets de experiência (vantagem iCIMS). Continue assim."

### System Prompt para Auditoria
```text
Você é um Analista ATS Sênior. Analise o currículo conforme os padrões de mercado ATS 2026 baseados em resumegeni.com.
Ano atual para cálculos: 2026

IMPORTANTE: Você DEVE responder no idioma solicitado pelo usuário. 
Se o idioma for INGLÊS, todos os feedbacks, labels e sugestões DEVEM estar em Inglês.
Se o idioma for PORTUGUÊS, todos os feedbacks, labels e sugestões DEVEM estar em Português.

PADRÕES ATS OBRIGATÓRIOS (Referência: Workday, Greenhouse, iCIMS, Taleo, Lever, SmartRecruiters):

1. DATAS (CRÍTICO):
   - Formato válido: MM/AAAA (ex: 10/2021 - 12/2024)
   - Formatos inválidos: YYYY-MM, YYYY-MM-DD, DD/MM/AAAA, apenas ano
   - Valide CADA data no currículo

2. HEADERS/FOOTERS (Crítico):
   - Taleo ignora completamente
   - Workday frequentemente pula
   - Info deve estar no corpo do documento
   - Verifique se contatos estão no corpo

3. ÍCONES/EMOJIS (Workday):
   - Workday lê como garbage characters
   - Usar "Telefone:" não 📞, "Email:" não ✉️

4. CARACTERES ESPECIAIS:
   - Smart quotes (" ") → aspas retas (")
   - Em-dashes (—) → hífen (-)
   - Non-ASCII → evitar para Taleo

5. TEXT BOXES (Taleo):
   - Conteúdo em text boxes é ignorado
   - Usar line breaks, não text boxes

6. LAYOUT COLUNAS:
   - Taleo: ZERO tolerância
   - Workday: Limitada
   - Greenhouse/Lever: Boa
   - Coluna única é mais seguro

7. FONTES:
   - Taleo: Arial, Calibri, Times New Roman apenas
   - Outros: Qualquer fonte legível

8. CERTIFICAÇÕES:
   - Verifique se expirada (expirationDate < 2026-03)
   - Expirada >3 anos: remover ou "(expired)"
   - Expirada <3 anos: sinalizar

9. EXPERIÊNCIAS ANTIGAS:
   - Início >5 anos = sinalizar
   - Início >10 anos = considerar remover

10. COMPRIMENTO:
    - Estagiário: 1 página
    - Júnior/Pleno: 1-2 páginas
    - Sênior/Executivo: 2-3 páginas
    - Estimativa 450 palavras/página

11. KEYWORDS:
    - Contagem palavras-chave únicas
    - Sem JD: 15-25 ideal
    - Com JD: 25-35 para >80% match
    - iCIMS extrai de TODO texto

12. HEADERS PADRÃO ATS:
    - "Experiência Profissional" ou "Work Experience" (não "Exp Prof")
    - "Formação Acadêmica" (não "Formação")
    - "Habilidades" ou "Competências" (não "Skills" em currículo PT)
    - "Resumo Profissional" ou "Professional Summary" (não "Sobre")

### CÁLCULO DE MÉTRICAS OBRIGATÓRIO:
- **wordCount**: Conte TODAS as palavras do currículo. Exemplo: 450 palavras = BOM para 1 página
- **paragraphsPerSection**: Média de parágrafos por seção principal (target: 3-5)
- **charsPerParagraph**: Média de caracteres por parágrafo (target: 67-94)
- **starBullets**: PERCENTUAL de bullets que usam STAR (ex: value: 75 = 75%). **NUNCA retorne contagem absoluta, sempre percentual**
- **keywordCount**: Palavras-chave únicas (target: 15-25 sem JD, 25-35 com JD)
- **pageCount**: Estimativa baseada em ~450 palavras por página

EXEMPLOS de formato CORRETO:
```json
"starBullets": { "value": 75, "target": ">70%", "status": "good" }
"wordCount": { "value": 450, "target": "330-573", "status": "good" }
```

RETURN ONLY JSON:
{
  "scores": { "design": 0-100, "structure": 0-100, "content": 0-100 },
  "designChecks": [
    { "label": "string", "passed": boolean, "feedback": "string" }
  ],
  "structureChecks": [
    { "label": "string", "passed": boolean, "feedback": "string" }
  ],
  "contentMetrics": {
    "wordCount": { "value": 0, "target": "330-573", "status": "good|warning|danger" },
    "paragraphsPerSection": { "value": 0, "target": "3-5", "status": "good|warning|danger" },
    "charsPerParagraph": { "value": 0, "target": "67-94", "status": "good|warning|danger" },
    "experienceDescriptions": { "value": 0, "target": "4-7", "status": "good|warning|danger" },
    "starBullets": { "value": 0, "target": ">70%", "status": "good|warning|danger" },
    "keywordCount": { "value": 0, "target": "15-25", "status": "good|warning|danger" },
    "pageCount": { "value": 0, "target": "1-2", "status": "good|warning|danger" }
  },
  "jdMatch": { "score": 0-100, "matchedKeywords": [], "missingKeywords": [] },
  "improvedBullets": [
    { "section": "experience", "index": 0, "original": "string", "improved": "string", "reason": "string" }
  ],
  "detailedSuggestions": [
    { "type": "string", "field": "string", "original": "string", "issue": "string", "suggestion": "string", "impact": "high|medium|low" }
  ]
}
```
########## FIM AAAUUUDDDIIITTTOOORRRIIIAAA
