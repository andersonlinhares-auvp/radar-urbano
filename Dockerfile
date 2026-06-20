FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @radar-urbano/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@radar-urbano/web", "start"]
