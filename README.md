# ResuMatch

> Open-Source AI Resume Builder & ATS Auditor. Stop guessing if your resume passes the bot. ResuMatch ensures 100% compatibility with modern Applicant Tracking Systems (ATS).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

[Features](#features) • [Quick Start](#quick-start) • [Configuration](#configuration) • [Development](#development) • [Architecture](#architecture) • [Tech Stack](#tech-stack)

Most free resume builders (and even some paid ones like Canva) create PDFs that are "invisible" or "garbled" to ATS systems like Workday, Taleo, and Greenhouse. ResuMatch solves this with a dedicated **ATS-Optimal Engine** that prioritizes machine readability without sacrificing professional design.

## Features

### AI-Powered Resume Management

- **Local & Cloud AI Support**: Use Google Gemini, OpenAI, or run everything locally with [Ollama](https://ollama.com/)
- **Smart Parsing**: Upload a PDF/DOCX and let AI map your data instantly
- **STAR Method Rewriting**: Transform weak bullets into high-impact, measurable achievements
- **Multilingual Support**: Native support for Portuguese and English with seamless translation

### ATS Audit & Scoring

- **Real-time Scoring**: Get a breakdown of content density, keyword optimization, and formatting risks
- **Job Matching**: Paste a Job Description (JD) and get a compatibility score with actionable gaps
- **Grammar & Impact**: Automated professional tone correction and STAR achievement generation

### ATS-Optimal Engine

- **Linear Reading Flow**: No multi-column layouts that confuse parsers
- **Character Sanitization**: Automatic removal of emojis, icons, and "smart quotes" that break OCR
- **Date Normalization**: All dates automatically converted to standard `MM/YYYY` format
- **Standard Fonts**: Enforced use of high-legibility fonts (Arial, Helvetica) for maximum extraction accuracy
- **Clean PDF Metadata**: Blocks browser-injected headers/footers during export

## Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/otavio-lemos/ResuMatch.git
cd ResuMatch

# Build and start the production stack
docker-compose up -d --build
```

Access the app at: [**http://localhost:3000**](http://localhost:3000)

> [!TIP]
> To run with a local LLM, install [Ollama](https://ollama.com/) and download your preferred model (e.g., `ollama run qwen3:8b`).

### Manual Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the application
npm run build

# Start the production server
npm start
```

## Configuration

No complex `.env` setup required for basic use. Once the app is running, navigate to the **Settings** (`/config`) page to:

1. Select your **AI Provider** (Gemini, OpenAI, or Ollama)
2. Enter your API Keys (stored securely in your browser's local storage)
3. Select your preferred Model

## Development

### Prerequisites

- Node.js 20+
- Docker (optional, for containerized development)

### Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
# Run the full validation suite
npm run lint && npm test
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `docker-compose up -d --build` | Build and start with Docker |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

## Architecture

ResuMatch follows a modular "Skill-Based" AI architecture:

- **`lib/ats-engine.ts`**: Core logic for calculating resume health scores and JD matching
- **`lib/ai-utils.ts`**: Utilities for AI integration and JSON parsing
- **`components/editor/ResumePreview.tsx`**: Hardened rendering engine for ATS-safe PDFs

## Tech Stack

| Category | Technology |
|----------|------------|
| **Core** | Next.js 15 (App Router), TypeScript |
| **Design** | Tailwind CSS 4 |
| **State** | Zustand |
| **AI** | Google Gemini SDK, OpenAI SDK, Ollama (Local) |
| **Parsing** | Mammoth (DOCX), PDF-Parse |
| **Testing** | Jest, Playwright |
| **i18n** | next-intl |
