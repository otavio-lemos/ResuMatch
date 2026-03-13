---
name: ats-parser
description: Especialista em parsing de currículos e extração de dados estruturados para importação.
allowed-tools: Read, Write, Edit
---

# ATS Parser Skill (Import Phase)

> Habilidade dedicada à importação de currículos: extrair dados de arquivos desestruturados (PDF, DOCX, TXT) para o formato JSON do sistema.

---

########## PPPAAARRRSSSIIINNNGGG
## 1. Fase de Importação (Parsing)

Quando a tarefa for extrair dados de um arquivo desestruturado (PDF, DOCX, TXT) para o formato JSON do sistema, aplique as seguintes regras:

### Regras de Extração (Zero Alucinação)
- **Fidelidade Absoluta:** Não invente dados. Se uma informação não existir no documento original, retorne string vazia `""` ou array vazio `[]`.
- **Preservação de Parágrafos:** Mantenha as quebras de parágrafo originais usando única quebra de linha (\n). Não use linha em branco (duplo \n) entre parágrafos. Não remova ou aglutine bullets originais.
- **Padronização de Datas:** Converter para formato `MM/AAAA` (ex: "10/2021"). Se cargo atual, usar `current`: true e `endDate`: "".
- **Categorização de Habilidades:** Agrupar em categorias lógicas ("Linguagens", "Ferramentas", "Soft Skills", "Frameworks", "Cloud", "Metodologias").
- **Geração de IDs:** IDs curtos únicos (ex: `exp-1`, `edu-1`).

### Regras de Datas para ATS (CRÍTICO)
- **Formato preferencial:** MM/AAAA (ex: "10/2021 - 12/2024")
- **Formato alternativo:** "Outubro 2021" a "Dezembro 2024"
- **Formatos INVÁLIDOS:** YYYY-MM, YYYY-MM-DD, DD/MM/YYYY, apenas o ano
- **Nota:** Sistemas ATS calculam tempo de experiência baseados nas datas

### System Prompt para Importação
```text
Você é um Extrator de Dados de Currículos de alta precisão. Sua única função é ler o documento fornecido e extrair informações para JSON rigoroso.
Não invente dados. Padronize datas para MM/AAAA.

## TAREFAS CRÍTICAS:
1. IDENTIFIQUE OS NOMES REAIS DOS CABEÇALHOS das seções no currículo original
   - Exemplos: "EXPERIÊNCIA PROFISSIONAL", "WORK EXPERIENCE", "FORMAÇÃO ACADÊMICA", "EDUCATION", "HABILIDADES", "SKILLS", etc.
   - Cada seção do currículo tem um nome original - você DEVE extrair esse nome

2. MAPEIE cada seção identificada para o campo correspondente no JSON

## FORMATO JSON OBRIGATÓRIO:
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA ou atual", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA ou atual", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": ["skill 1"] } ],
  "certifications": [ { "id": "cert-1", "name": "", "issuer": "", "date": "MM/AAAA", "expirationDate": "MM/AAAA ou null" } ],
  "projects": [ { "id": "proj-1", "title": "", "subtitle": "", "description": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA ou atual", "current": false } ],
  "languages": [ { "id": "lang-1", "language": "", "proficiency": "" } ],
  "volunteer": [ { "id": "vol-1", "organization": "", "role": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA", "description": "" } ],
  "_sectionHeaders": {
    "personalInfo": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "summary": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "experiences": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "education": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "skills": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "certifications": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "projects": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "languages": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL",
    "volunteer": "NOME REAL DO CABEÇALHO NO CURRÍCULO ORIGINAL"
  }
}
```
########## FIM PPPAAARRRSSSIIINNNGGG
