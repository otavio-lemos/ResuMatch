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

### EXEMPLO DE SAÍDA CORRETA

```json
{
  "personalInfo": { "fullName": "João Silva", "title": "Engenheiro de Software", "email": "joao@email.com", "phone": "(11) 99999-9999", "location": "São Paulo, SP", "linkedin": "linkedin.com/in/joao", "github": "github.com/joao", "portfolio": "" },
  "summary": "Profissional com 10 anos de experiência em desenvolvimento de software.",
  "experiences": [
    { "id": "exp-1", "company": "Empresa Tech", "position": "Desenvolvedor Senior", "location": "São Paulo", "startDate": "01/2020", "endDate": "12/2024", "current": false, "description": "- Liderança de equipe\n- Desenvolvimento de APIs\n- Code review" }
  ],
  "education": [{ "id": "edu-1", "institution": "USP", "degree": "Bacharelado em Ciência da Computação", "location": "São Paulo", "startDate": "01/2010", "endDate": "12/2014", "current": false, "description": "" }],
  "skills": [{ "id": "skill-1", "category": "Programação", "skills": ["JavaScript", "Python", "Java"] }],
  "certifications": [{ "id": "cert-1", "name": "AWS Solutions Architect", "issuer": "Amazon", "date": "01/2023", "expirationDate": "" }],
  "projects": [],
  "languages": [{ "id": "lang-1", "language": "Português", "proficiency": "Nativo" }],
  "volunteer": [],
  "_sectionHeaders": { "personalInfo": "Dados Pessoais", "summary": "Resumo Profissional", "experiences": "Experiência Profissional", "education": "Formação Acadêmica", "skills": "Competências", "certifications": "Cursos e Certificações", "projects": "Projetos", "languages": "Idiomas", "volunteer": "Voluntariado" }
}
```

### REGRAS CRÍTICAS DE IDIOMA E CABEÇALHOS

**ATENÇÃO MÁXIMA - _sectionHeaders É OBRIGATÓRIO:**
O campo _sectionHeaders DEVE ser preenchido com os NOMES REAIS das seções do currículo original.
- Se o currículo tem "Minha Jornada" como experiência, _sectionHeaders.experiences deve ser "Minha Jornada"
- Se o currículo tem "Work History", _sectionHeaders.experiences deve ser "Work History"
- NÃO use nomes traduzidos ou padronizados. Use o texto EXATO que aparece no PDF.
- Seção sem cabeçalho no original: use string vazia ""

Exemplo para currículo brasileiro com nomes personalizados:
```json
"_sectionHeaders": {
  "personalInfo": "Dados Pessoais",
  "summary": "Sobre Mim",
  "experiences": "Minha Jornada",
  "education": "Formação",
  "skills": "O que sei fazer",
  "certifications": "Certificados",
  "projects": "Projetos Pessoais",
  "languages": "Idiomas",
  "volunteer": "Trabalho Voluntário"
}
```

Exemplo para currículo inglês:
```json
"_sectionHeaders": {
  "personalInfo": "Personal Details",
  "summary": "About Me",
  "experiences": "Work History",
  "education": "Education",
  "skills": "Technical Skills",
  "certifications": "Certifications",
  "projects": "Projects",
  "languages": "Languages",
  "volunteer": "Volunteering"
}
```

2. **COPIE O TEXTO ORIGINAL** - Não resuma, não abrevie.
3. **description** em experiences: inclua TODOS os bullets e parágrafos. Use \n para quebras de linha (ex: "- Liderança\n- Desenvolvimento\n- Code review").
4. **Sanitização ATS (Crítico):** Ignore emojis, símbolos decorativos (📞, ✉️, 🎯) ou aspas tipográficas. Mantenha os valores puramente textuais.
5. **Certeza de Headers**: Só deixe vazio "" se o documento original realmente não possuir um cabeçalho explícito para aquela seção.


### CAMPOS OBRIGATÓRIOS

- personalInfo (com todos os sub-campos, incluindo github)
- summary (texto completo)
- experiences (com description)
- education
- skills

### OUTPUT (retorne APENAS o JSON, sem texto)

```json
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "MM/AAAA", "endDate": "MM/AAAA", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": [] } ],
  "certifications": [ { "id": "cert-1", "name": "", "issuer": "", "date": "MM/AAAA", "expirationDate": "" } ],
  "projects": [],
  "languages": [],
  "volunteer": [],
  "_sectionHeaders": { "personalInfo": "NOME EXATO DO CABEÇALHO ORIGINAL", "summary": "...", "experiences": "...", "education": "...", "skills": "...", "certifications": "...", "projects": "...", "languages": "...", "volunteer": "..." }
}
```

########## FIM PPPAAARRRSSSIIINNNGGG
