# ResuMatch

> Open-Source AI Resume Builder & ATS Auditor. Stop guessing if your resume passes the bot.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## Quick Start

```bash
git clone https://github.com/otavio-lemos/ResuMatch.git
cd ResuMatch
docker-compose up -d --build
```

Access: [**http://localhost:3000**](http://localhost:3000)

> [!TIP]
> **Recommendation**: Use **Firefox** for printing and saving as PDF for better ATS compatibility.

> [!TIP]
> To run with a local LLM, install [Ollama](https://ollama.com/) and download the **qwen3:7b** model (homologated for this app).

## Architecture

```mermaid
flowchart TB
    A[Open App] --> B{has Resume?}
    B -->|No| C[Choose Template]
    B -->|Yes| D[Dashboard]
    C --> E[Fill Resume Data]
    E --> D
    D --> F[Preview]
    F --> G[Export PDF]
    D --> H[AI Parser]
    H --> E
    D --> I[ATS Analysis]
    I --> J[Score]
    I -.-> K[Job Description]
    K --> J
```

## Tech Stack

| Category | Technology |
|----------|------------|
| **Core** | Next.js 15 (App Router), TypeScript |
| **Design** | Tailwind CSS 4 |
| **State** | Zustand |
| **AI** | Google Gemini, OpenAI, Ollama |
| **Parsing** | Mammoth, PDF-Parse |
| **i18n** | next-intl |

## Configuration

Navigate to **Settings** (`/config`) to configure:
- AI Provider (Gemini, OpenAI, Ollama)
- API Keys (stored in localStorage)
- Preferred Model
