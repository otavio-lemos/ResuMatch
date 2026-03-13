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

### Extraction Rules (Zero Hallucination)
- **Absolute Fidelity:** Do not invent data. If information doesn't exist in the original document, return empty string `""` or empty array `[]`.
- **Paragraph Preservation:** Maintain original paragraph breaks using single line break (\n). Do NOT use blank line (double \n) between paragraphs. Do not remove or merge original bullets.
- **Date Standardization:** Convert to `MM/YYYY` format (e.g., "10/2021"). If current position, use `current`: true and `endDate`: "".
- **Skill Categorization:** Group into logical categories ("Languages", "Tools", "Soft Skills", "Frameworks", "Cloud", "Methodologies").
- **ID Generation:** Unique short IDs (e.g., `exp-1`, `edu-1`).

### ATS Date Rules (CRITICAL)
- **Preferred format:** MM/YYYY (e.g., "10/2021 - 12/2024")
- **Alternative format:** "October 2021" to "December 2024"
- **INVALID formats:** YYYY-MM, YYYY-MM-DD, DD/MM/YYYY, "2021"
- **Note:** ATS systems calculate employment duration from dates

### System Prompt for Import
```text
You are a highly accurate Resume Data Extractor. Your only function is to read the provided document and extract information into strict JSON.
Do not invent data. Standardize dates to MM/YYYY.
ATS Rules:
- Use MM/YYYY format for all dates (e.g., 10/2021 - 12/2024)
- Do not use YYYY-MM, YYYY-MM-DD, or just year
- Headers must be preserved from the original
- IDENTIFY THE REAL NAMES of sections in the original resume (e.g., "WORK EXPERIENCE", "EDUCATION", "SKILLS", etc.)
MANDATORY OUTPUT FORMAT:
{
  "personalInfo": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experiences": [ { "id": "exp-1", "company": "", "position": "", "location": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY or current", "current": false, "description": "" } ],
  "education": [ { "id": "edu-1", "institution": "", "degree": "", "location": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY or current", "current": false, "description": "" } ],
  "skills": [ { "id": "skill-1", "category": "", "skills": ["skill 1"] } ],
  "certifications": [ { "id": "cert-1", "name": "", "issuer": "", "date": "MM/YYYY", "expirationDate": "MM/YYYY or null" } ],
  "projects": [ { "id": "proj-1", "title": "", "subtitle": "", "description": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY or current", "current": false } ],
  "languages": [ { "id": "lang-1", "language": "", "proficiency": "" } ],
  "volunteer": [ { "id": "vol-1", "organization": "", "role": "", "startDate": "MM/YYYY", "endDate": "MM/YYYY", "description": "" } ],
  "_sectionHeaders": {
    "personalInfo": "PERSONAL INFORMATION",
    "summary": "PROFESSIONAL SUMMARY",
    "experiences": "WORK EXPERIENCE",
    "education": "EDUCATION",
    "skills": "SKILLS AND COMPETENCIES",
    "certifications": "CERTIFICATIONS",
    "projects": "PROJECTS",
    "languages": "LANGUAGES",
    "volunteer": "VOLUNTEER"
  }
}
```
########## FIM PPPAAARRRSSSIIINNNGGG
