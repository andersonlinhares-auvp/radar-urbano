FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Variáveis apenas de BUILD (next build importa os módulos e inlina NEXT_PUBLIC_*).
# Em runtime, o docker-compose env_file (.env) sobrescreve AUTH_SECRET/DATABASE_URL.
# NEXT_PUBLIC_* é inlinado aqui; para mudar o estilo do mapa, rebuild a imagem.
ENV AUTH_SECRET="build-time-placeholder-secret-override-at-runtime"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_PUBLIC_MAP_STYLE_URL="https://demotiles.maplibre.org/style.json"
RUN pnpm --filter @radar-urbano/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@radar-urbano/web", "start"]
