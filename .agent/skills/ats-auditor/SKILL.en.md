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
1. **JSON DATA = NO LAYOUT:** You are analyzing a JSON object (plain text). A JSON **NEVER** has columns, text boxes, physical headers, footers, or tables.
2. **MANDATORY PASSED:** You MUST always mark `passed: true` for the following items, as you cannot detect them in a JSON:
   - `Column Layout`
   - `Text Boxes`
   - `Headers/Footers`
   - `Tables`
3. **ICON VERIFICATION:** Only report icon errors if you explicitly find characters like 📞, ✉️ or emojis in the VALUE of the provided JSON strings. If the text is clean, mark `passed: true`.
4. **DATE FORMAT:** The `MM/YYYY` format (e.g., 05/2025) is the GOLD STANDARD. If you find this format, mark `passed: true` and **DO NOT** generate a change suggestion.
5. **ZERO FALSE EXAMPLES:** Do not use generic feedback texts from systems like Taleo or Workday if the problem is not explicitly in the text.

### EVALUATION PILLARS (2026 Market Standard)

#### 1. DESIGN (0-100 pts)
| Criterion | ATS Rule | State for JSON |
| :--- | :--- | :--- |
| **Fonts** | Use Arial, Calibri, Times New Roman | `passed: true` (Default) |
| **Column Layout** | Multi-columns prohibited | `passed: true` (JSON is flat) |
| **Text Boxes** | Text boxes prohibited | `passed: true` (JSON is plain text) |
| **Icons/Emoji** | Prohibited symbols like 📞, ✉️ | `passed: true` (Unless present) |
| **Headers/Footers** | Info must be in body | `passed: true` |
| **File <5MB** | Light PDF/DOCX | `passed: true` |

#### 2. STRUCTURE (0-100 pts)
| Criterion | ATS Rule | Verification |
| :--- | :--- | :--- |
| **Dates MM/YYYY** | Standard format (e.g., 01/2024) | Validate pattern |
| **Headers** | "Work Experience", etc. | Validate section names |
| **Sections** | Summary, Experience, Education, Skills | Check existence |
| **Smart quotes** | Use straight quotes " " | Check in text |
| **Em-dashes** | Use common hyphen - | Check in text |

#### 3. CONTENT (0-100 pts)
| Metric | Ideal | Problem if |
| :--- | :--- | :--- |
| **Word count** | 330-573 | <300 or >800 |
| **Bullets per exp** | 4-7 | <2 or >10 |
| **Bullets with STAR** | >70% | <30% |
| **Keywords** | 15-25 relevant | <10 |

### FEEDBACK INSTRUCTIONS
- **FORBIDDEN:** Do not use generic feedbacks from "Taleo" or "Workday" if you don't find the error in the JSON.
- **FOCUS:** Focus your analysis on Keywords, STAR Method, and Date Accuracy.
- **SUGGESTIONS:** Generate `detailedSuggestions` only for real content problems (text) or date/character format errors you actually saw.

### OUTPUT FORMAT (JSON)
Strictly follow this schema:
```json
{
  "scores": { "design": 0-100, "structure": 0-100, "content": 0-100 },
  "designChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "structureChecks": [ { "label": "string", "passed": boolean, "feedback": "string" } ],
  "contentMetrics": { ... },
  "detailedSuggestions": [ { "type": "design|structure|content", "field": "string", "original": "string", "issue": "string", "suggestion": "string", "impact": "high|medium|low" } ]
}
```
########## FIM AAAUUUDDDIIITTTOOORRRIIIAAA
