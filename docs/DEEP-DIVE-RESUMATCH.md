# Deep Dive - Estrutura do Projeto ResuMatch

## Visão Geral

O projeto ResuMatch é uma aplicação Next.js para criação e otimização de currículos para sistemas ATS (Applicant Tracking System).

## Estrutura de Diretórios

```
oliacv/
├── app/
│   ├── page.tsx                    # Dashboard principal (/)
│   ├── layout.tsx                  # Layout raiz
│   ├── analisar/page.tsx           # Redireciona para /dashboard
│   ├── config/page.tsx             # Página de configuração
│   ├── modelos/page.tsx            # Modelos de currículos
│   ├── dashboard/
│   │   ├── page.tsx               # Redireciona para /
│   │   └── [id]/page.tsx         # Página de análise ATS
│   ├── editor/[id]/page.tsx       # Editor de currículo
│   └── api/
│       ├── analyze/route.ts        # API de análise ATS
│       └── parse-resume/route.ts  # API de parsing
├── components/
│   ├── Navbar.tsx                 # Cabeçalho com navegação
│   ├── Footer.tsx                  # Rodapé
│   ├── ClientLayout.tsx            # Layout cliente
│   └── dashboard/
│       ├── ATSAnalysisView.tsx     # Componente de análise ATS
│       └── DashboardContent.tsx     # Conteúdo do dashboard
├── store/
│   ├── useResumeStore.ts           # Estado do currículo (Zustand)
│   ├── useAISettingsStore.ts       # Configurações de IA
│   └── useNavbarStore.ts           # Estado da navbar
└── .agent/skills/
    └── ats-analyzer/SKILL.md       # Skill de análise ATS
```

## Fluxo de Análise ATS

1. Usuário clica em "Executar Auditoria Geral" ou "Analisar com Vaga"
2. `ATSAnalysisView` chama `analyzeResume` do store
3. Store faz POST para `/api/analyze`
4. API usa a skill `ats-analyzer` com Gemini
5. Retorna análise com scores, checks e sugestões de melhoria

## Pontos de Atenção para as Modificações

### 1. Tela de Análise (`ATSAnalysisView.tsx`)
- **Bordas arredondadas**: Muitos elementos com `rounded-2xl`, `rounded-xl`
- **Sugestões**: Dropdown + botão aplicar precisa ser reformulado
- **ELITE vs STAR**: Label atual é "Sugestão Elite"
- **Nome do campo**: Não existe atualmente

### 2. Dashboard (`DashboardContent.tsx`)
- **Navegação dots**: `<button class="w-2 h-2 transition-all bg-blue-600 w-4">` 
- **Miniatura**: Card simulado (fake), não CV real
- **Botões analisar/editar**: Estão abaixo do currículo

### 3. Navbar (`Navbar.tsx`)
- **Logo**: "ResuMatch"
- **Flags**: 🇧🇷 e 🇺🇸 para tradução
- **Botões dinâmicos**: Usados para "Criar Novo", "Importar"
- **Botões estáticos**: "Config", "Dashboard"

### 4. Rodapé (`Footer.tsx`)
- **Posição**: sticky bottom-0
- **Conteúdo**: GitHub, LinkedIn, slogan

### 5. Modelo de Dados (`useResumeStore.ts`)

```typescript
interface AIAnalysis {
  score: number;
  scores: { design: number; estrutura: number; conteudo: number };
  designChecks: AICheck[];
  estruturaChecks: AICheck[];
  conteudoMetrics: { ... };
  improvedBullets: { original: string; improved: string }[];
}
```

### 6. API de Análise (`app/api/analyze/route.ts`)
- Usa skill `ats-analyzer` do `.agent/skills/`
- Filtra seções ativas antes de enviar
- Retorna JSON com scores e sugestões

## Respondendo a Pergunta sobre ELITE vs STAR

**Sim, deveria ser STAR!**

STAR é o método padrão da indústria para descrever conquistas em currículos:
- **S**ituation - Contexto
- **T**ask - Desafio
- **A**ction - Ação tomada
- **R**esult - Resultado量化

A skill `ats-analyzer` já menciona "Método XYZ" que é uma referência ao STAR. O termo "Elite" foi usado incorretamente.

---

*Documento gerado em: 2026-03-04*
