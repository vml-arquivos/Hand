FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN corepack enable

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# CRÍTICO: copia patches/ antes do pnpm install --prod
# O pnpm exige que os arquivos de patch existam mesmo em instalação de produção,
# pois o pnpm-lock.yaml referencia patches/wouter@3.7.1.patch
COPY --from=builder /app/patches ./patches

# Instala apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

# Cria o diretório de uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

EXPOSE 3000
CMD ["sh", "-c", "node scripts/apply-migrations.mjs && node dist/index.js"]
