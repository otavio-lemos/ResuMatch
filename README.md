# ResuMatch 🚀

> **Open-Source AI Resume Builder & ATS Auditor.** Stop guessing if your resume passes the bot. ResuMatch ensures 100% compatibility with modern Applicant Tracking Systems (ATS).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

ResuMatch is a professional-grade platform designed to level the playing field for job seekers. While most builders focus on human aesthetics, ResuMatch prioritizes **machine readability** without sacrificing professional design.

---

## 🌟 Why ResuMatch?

Most free resume builders (and even some paid ones like Canva) create PDFs that are "invisible" or "garbled" to ATS systems like **Workday, Taleo, and Greenhouse**. 

ResuMatch solves this with a dedicated **ATS-Optimal Engine**:
- **Linear Reading Flow**: No multi-column layouts that confuse parsers.
- **Character Sanitization**: Automatic removal of emojis, icons, and "smart quotes" that break OCR.
- **Date Normalization**: All dates are automatically converted to standard `MM/YYYY` format.
- **Standard Fonts**: Enforced use of high-legibility fonts (Arial, Helvetica) for maximum extraction accuracy.
- **Clean PDF Metadata**: Blocks browser-injected headers/footers during export.

---

## 📋 Key Features

### 🧠 Intelligent AI Engine
- **Local & Cloud Support**: Use Google Gemini, OpenAI, or run everything locally with **Ollama**.
- **Resume Parsing**: Upload a PDF/DOCX and let AI map your data instantly.
- **STAR Method Rewriting**: Transform weak bullets into high-impact, measurable achievements.
- **Multilingual Mastery**: Native support for Portuguese and English with seamless translation.

### 🤖 ATS Audit & Scoring
- **Real-time Scoring**: Get a breakdown of content density, keyword optimization, and formatting risks.
- **Job Matching**: Paste a Job Description (JD) and get a compatibility score with actionable gaps.
- **Grammar & Impact**: Automated professional tone correction and STAR achievement generation.

---

## 🚀 Quick Start (Docker)

The fastest way to get ResuMatch running is via Docker.

```bash
# 1. Clone the repository
git clone https://github.com/otavio-lemos/ResuMatch.git
cd ResuMatch

# 2. Start the production stack
docker-compose up -d --build
```

Access the app at: [**http://localhost:3000**](http://localhost:3000)

> [!TIP]
> To run with a local LLM, install [Ollama](https://ollama.com/) and download your preferred model (e.g., `ollama run qwen2.5:7b`).

---

## ⚙️ Configuration

No complex `.env` setup required for basic use. Once the app is running, navigate to the **Settings (`/config`)** page to:
1. Select your **AI Provider** (Gemini, OpenAI, or Ollama).
2. Enter your API Keys (stored securely in your browser's local storage).
3. Select your preferred Model.

---

## 🛠️ Development (Local)

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Run full validation suite
npm run lint && npm test
```

---

## 📦 Tech Stack

| Category | Technology |
|----------|------------|
| **Core** | Next.js 15 (App Router), TypeScript |
| **Design** | Tailwind CSS 4 |
| **State** | Zustand |
| **AI** | Google Gemini SDK, OpenAI SDK, Ollama (Local) |
| **Parsing** | Mammoth (DOCX), PDF-Parse |
| **Testing** | Jest, Playwright |

---

## 📁 Architecture

ResuMatch follows a modular "Skill-Based" AI architecture:
- **`.agent/skills/`**: Contains professional prompt engineering rules for Parsing, Auditing, and Rewriting.
- **`lib/ats-engine.ts`**: The core logic for calculating resume health scores.
- **`components/editor/ResumePreview.tsx`**: The hardened rendering engine for ATS-safe PDFs.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
