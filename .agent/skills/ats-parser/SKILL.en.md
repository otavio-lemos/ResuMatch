---
name: ats-parser
description: Specialist in resume parsing and structured data extraction for import.
allowed-tools: Read, Write, Edit
---

# ATS Parser Skill (Import Phase)

> Skill dedicated to importing resumes: extracting data from unstructured files (PDF, DOCX, TXT) into the system's JSON format.

---

########## PPPAAARRRSSSIIINNNGGG
## 1. Import Phase (Parsing)

When the task is to extract data from an unstructured file (PDF, DOCX, TXT) to the system's JSON format, apply the following rules:

### CORRECT OUTPUT EXAMPLE

```json
{
  "personalInfo": { "fullName": "John Smith", "title": "Software Engineer", "email": "john@email.com", "phone": "+1-555-123-4567", "location": "New York, NY", "linkedin": "linkedin.com/in/john", "github": "github.com/john", "portfolio": "" },
  "summary": "Professional with 10 years of experience in software development.",
  "experiences": [
    { "id": "exp-1", "company": "Tech Company", "position": "Senior Developer", "location": "New York", "startDate": "01/2020", "endDate": "12/2024", "current": false, "description": ["Team leadership", "API development", "Code review"] }
  ],
  "education": [{ "id": "edu-1", "institution": "MIT", "degree": "Bachelor in Computer Science", "location": "Boston", "startDate": "09/2010", "endDate": "06/2014", "current": false, "description": "" }],
  "skills": [{ "id": "skill-1", "category": "Programming", "skills": ["JavaScript", "Python", "Java"] }],
  "certifications": [{ "id": "cert-1", "name": "AWS Solutions Architect", "issuer": "Amazon", "date": "01/2023", "expirationDate": "" }],
  "projects": [],
  "languages": [{ "id": "lang-1", "language": "English", "proficiency": "Native" }],
  "volunteer": [],
  "_sectionHeaders": { "personalInfo": "Personal Info", "summary": "Professional Summary", "experiences": "Work Experience", "education": "Education", "skills": "Skills & Technologies", "certifications": "Certifications", "projects": "Projects", "languages": "Languages", "volunteer": "Volunteering" }
}
```

### CRITICAL RULES FOR LANGUAGE AND HEADERS

**MAXIMUM ATTENTION - _sectionHeaders IS MANDATORY:**
The _sectionHeaders field MUST be filled with the REAL NAMES of the sections from the original resume.
- If resume has "My Journey" as experience, _sectionHeaders.experiences must be "My Journey"
- If resume has "Work History", _sectionHeaders.experiences must be "Work History"
- DO NOT use translated or standardized names. Use the EXACT text appearing in the PDF.
- Section without original header: use empty string ""

Example for resume with custom headers:
```json
"_sectionHeaders": {
  "personalInfo": "Personal Details",
  "summary": "About Me",
  "experiences": "My Journey",
  "education": "Education Background",
  "skills": "Technical Expertise",
  "certifications": "Certificates & Badges",
  "projects": "Personal Projects",
  "languages": "Languages Spoken",
  "volunteer": "Community Work"
}
```

1. **_sectionHeaders (VITAL)**: Capture EXATLY the text that appears as the section title in the original file. They must reflect 1:1 what the user wrote on the paper.
   - If the resume is in ENGLISH and the title is "Professional Background", use "Professional Background".
   - If the resume is in PORTUGUESE and the title is "Minha Jornada", use "Minha Jornada".
   - **NEVER** translate, summarize, or standardize these titles in the `_sectionHeaders` field.
   - **IGNORE** any trailing generic headers like "Experience", "Education", "Certificates" that are not followed by actual content. These are often artifacts of the extraction process and should NOT be included in the parsed data.
   - **NEVER** include these generic labels as part of section content if they are just standalone words at the end of the document.

2. **COPY ORIGINAL TEXT** - Do not summarize, do not abbreviate.
3. **description** in experiences: include ALL bullets and paragraphs. MANDATORY: Return an array of strings (one string for each bullet or paragraph). EXAMPLE: `"description": ["Team leadership", "API development", "Code review"]` (not "Team leadership - Development...").
4. **ATS Sanitization (Critical):** Ignore emojis, decorative symbols (📞, ✉️, 🎯) or smart quotes. Keep values purely textual.
5. **Header Certainty**: Only leave empty "" if the original document really doesn't have an explicit header for that section.


### REQUIRED FIELDS

- personalInfo (with all sub-fields, including github)
- summary (complete text)
- experiences (with description)
- education
- skills

### OUTPUT (return ONLY the JSON, no text)

```json
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": [] } ],
  "certifications": [ { "id": "cert-1", "name": "", "issuer": "", "date": "MM/YYYY", "expirationDate": "" } ],
  "projects": [],
  "languages": [],
  "volunteer": [],
  "_sectionHeaders": { "personalInfo": "EXACT ORIGINAL HEADER NAME", "summary": "...", "experiences": "...", "education": "...", "skills": "...", "certifications": "...", "projects": "...", "languages": "...", "volunteer": "..." }
}
```

########## FIM PPPAAARRRSSSIIINNNGGG
