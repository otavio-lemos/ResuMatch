# ResuMatch

AI-powered resume builder with ATS scoring, intelligent parsing, and multilingual support.

## Features

- **ATS Scoring Engine** - Real-time feedback on readability, content density, and keyword optimization
- **AI Writing Assistance** - STAR method optimization, grammar correction, and text rewriting
- **Intelligent Parsing** - Import from PDF, DOCX, or TXT with AI-filled fields
- **Job Match Analysis** - Paste a job description and get compatibility scoring
- **Multilingual** - Automatic translation between Portuguese and English
- **8 Professional Templates** - ATS-optimized, executive, tech, academic, and more

## Quick Start

```bash
# Clone and install
git clone https://github.com/otavio-lemos/ResuMatch.git
cd ResuMatch
npm install --legacy-peer-deps

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
# Development
docker build -f Dockerfile-DevOps -t resumatch-dev .
docker run -p 3000:3000 resumatch-dev

# Production
docker-compose up -d --build
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| AI | OpenAI, Google Gemini, Ollama |
| Testing | Jest, Playwright |

## Configuration

Configure AI providers through the built-in settings page (`/config`). No `.env` files required.

Supported providers:
- **Google Gemini** (default)
- **OpenAI** (GPT models)
- **Ollama** (local models)

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   ├── editor/           # Resume editor
│   ├── modelos/          # Template selection
│   ├── import/           # Import wizard
│   └── config/           # Settings page
├── components/           # React components
├── lib/                 # Utilities
│   ├── templates/        # Resume templates
│   ├── ats-engine.ts    # ATS scoring
│   └── translations.ts  # i18n
├── store/               # Zustand stores
└── .agent/              # AI agent skills
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |

## License

MIT
