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

### EXEMPLO DE SAÍDA CORRETA:
```json
{
  "personalInfo": { "fullName": "João Silva", "title": "Engenheiro de Software", "email": "joao@email.com", "phone": "(11) 99999-9999", "location": "São Paulo, SP", "linkedin": "linkedin.com/in/joao", "portfolio": "" },
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

### REGRAS:
1. **COPIE O TEXTO ORIGINAL** - Não resuma, não abrevie
2. **description** em experiences: inclua TODOS os bullets e parágrafos
3. **skills**: liste TODAS as habilidades encontradas
4. **_sectionHeaders**: OBRIGATÓRIO. Capture EXATAMENTE o título da seção como escrito no documento original (ex: "Sobre Mim", "Trajetória"). Só deixe vazio "" se o documento original realmente não possuir um cabeçalho explícito para aquela seção.
5. **Datas**: use MM/AAAA, para atual use "current":true
6. **Sanitização ATS (Crítico):** Ignore, exclua e NUNCA inclua no JSON emojis, símbolos decorativos (📞, ✉️, 🎯) ou aspas tipográficas criadas no currículo original. Mantenha os valores puramente textuais e limpos.

### CAMPOS OBRIGATÓRIOS:
- personalInfo (com todos os sub-campos)
- summary (texto completo)
- experiences (com description)
- education
- skills

### OUTPUT (retorne APENAS o JSON, sem texto):
```json
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
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
