---
name: ats-auditor
description: Specialist in ATS auditing, scoring and candidate tracking system compatibility analysis.
allowed-tools: Read, Write, Edit
---

# ATS Auditor Skill (Audit Phase)

> Skill dedicated to resume auditing: ATS score analysis, format validation and compatibility with systems like Workday, Taleo, Greenhouse.

---

########## AAAUUUDDDIIITTTOOORRRIIIAAA
## 2. Audit Phase (ATS Scoring)

### 🚨 ANTI-HALLUCINATION RULES (MANDATORY READING)
1. **JSON DATA = NO LAYOUT:** You are analyzing a JSON object. A JSON **NEVER** has columns, text boxes, physical headers, or footers.
2. **MANDATORY PASSED:** You MUST always mark `passed: true` for: `Column Layout`, `Text Boxes`, `Headers/Footers`, `Tables`. You cannot detect these issues in a JSON.
3. **REPORT ONLY WHAT YOU SEE:** If you don't explicitly find an emoji or icon in the text, mark `Icons/Emoji` as `passed: true`.
4. **CORRECT DATES:** The `MM/YYYY` format (e.g., 05/2025) is the GOLD STANDARD. If you find this format, mark `passed: true`.
5. **DEFAULT STATE:** Assume the resume is perfect in design until the raw text proves otherwise (e.g., presence of strange symbols).

### EVALUATION PILLARS (2026 Market Standard)

#### 1. DESIGN (0-100 pts)
Focus: Mechanical readability (OCR/parsing)

| Rule | Real Problem | Score Impact |
|-------|----------|--------------|
| Standard Fonts | Arial, Calibri, Times New Roman are ideal | -15 if not standard |
| Single Column | JSON is inherently flat (single column) | PASSED by default |
| No Text Boxes | JSON has no drawing elements | PASSED by default |
| No Icons/Emoji | Symbols like 📞 or ✉️ in text cause errors | -25 if found |
| No Headers/Footer | Data must be in the main body | PASSED by default |
| Light File | iCIMS recommends files < 5MB | PASSED by default |

#### 2. STRUCTURE (0-100 pts)
Focus: Correct parsing of sections

| Rule | Problem | Score Impact |
|-------|----------|--------------|
| Dates MM/YYYY | DD/MM/YYYY or YYYY-MM formats break parsing | -25 |
| Standard Headers | Use clear names like "Professional Experience" | -15 |
| Essential Sections | Missing Summary, Experience, Education or Skills | -20 each |
| Smart quotes | Curly quotes “ ” break old systems | -15 |
| Em-dashes | Long dashes — should be hyphens - | -10 |
| Photo | Some ATS reject automatically (GDPR) | -10 |

#### 3. CONTENT (0-100 pts)
Focus: Keyword density and STAR method

| Metric | Ideal Target | Problem if |
|--------|-------|-------------|
| Word count | 330-573 | <300 or >800 |
| Bullets per exp | 4-7 | <2 or >10 |
| Bullets with STAR | >70% | <30% |
| Keywords | 15-25 relevant | <10 |

### FEEDBACK INSTRUCTIONS
- Focus your analysis on **Keywords**, **STAR Method**, and **Dates**.
- Generate `detailedSuggestions` only for real content problems or date/character format errors you actually identified in the JSON.

### OUTPUT FORMAT (JSON)
```json
{
  "scores": { "design": 0-100, "structure": 0-100, "content": 0-100 },
  "designChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "structureChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "contentMetrics": {
    "wordCount": { "value": number, "target": "330-573", "status": "good|warning|danger" },
    "starBullets": { "value": percentage, "target": ">70%", "status": "good|warning|danger" },
    "keywordCount": { "value": number, "target": "15-25", "status": "good|warning|danger" }
  },
  "jdMatch": { "score": 0-100, "matchedKeywords": [], "missingKeywords": [] },
  "improvedBullets": [ { "section": "string", "index": number, "original": "string", "improved": "string", "reason": "string" } ],
  "detailedSuggestions": [ { "type": "design|structure|content", "field": "string", "original": "string", "issue": "string", "suggestion": "string", "impact": "high|medium|low" } ]
}
```
########## FIM AAAUUUDDDIIITTTOOORRRIIIAAA
