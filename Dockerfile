# ============================================================
# Estágio 1: Instalação de dependências
# ============================================================
FROM node:20-alpine AS deps

# Necessário para módulos nativos: pdf-parse (node-gyp), etc.
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# ============================================================
# Estágio 2: Build de produção
# ============================================================
FROM node:20-alpine AS builder

# Necessário caso haja recompilação de módulos nativos no build
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============================================================
# Estágio 3: Runner de produção (imagem final — mínima)
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Indica ao código (lib/ai.ts) que está rodando dentro do Docker
# (usado para resolver Ollama via host.docker.internal em vez de localhost)
ENV DOCKER_CONTAINER=true

# Criar grupo e usuário sem privilégios
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Criar diretório de dados persistentes com permissões corretas ANTES de trocar o user
RUN mkdir -p /app/data/resumes && chown -R nextjs:nodejs /app/data

# Arquivos estáticos públicos
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Skills do agente: CRÍTICO — lidas em runtime via fs.readFileSync em get-skill.ts
# NÃO podem ser excluídas pelo .dockerignore (os *.md são os prompts de IA)
COPY --from=builder --chown=nextjs:nodejs /app/.agent ./.agent

# Saída standalone do Next.js (contém server.js + node_modules mínimo)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Assets estáticos do Next.js (CSS, JS chunks, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js gerado pelo output: 'standalone' do Next.js
CMD ["node", "server.js"]
