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

1. **_sectionHeaders (VITAL)**: Capture EXATAMENTE o texto que aparece como título da seção no arquivo original. Eles devem refletir 1:1 o que o usuário escreveu no papel.
   - Se o currículo estiver em INGLÊS e o título for "Work Experience", use "Work Experience".
   - **IGNORE** any trailing generic headers like "Experience", "Education", "Certificates" that are not followed by actual content. These are often artifacts of the extraction process and should NOT be included in the parsed data.
   - **NEVER** include these generic labels as part of section content if they are just standalone words at the end of the document.

2. **COPIE O TEXTO ORIGINAL** - Não resuma, não abrevie.
3. **description** em experiences: inclua TODOS os bullets e parágrafos.
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
