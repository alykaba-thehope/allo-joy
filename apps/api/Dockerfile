# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Manifests — couche cachée
COPY package.json package-lock.json ./
COPY packages/types/package.json       ./packages/types/
COPY apps/api/package.json             ./apps/api/

RUN npm ci --ignore-scripts

# Prisma client (doit être généré avant la compilation TS)
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Build @allo-joy/types
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/
RUN npm run build -w @allo-joy/types 2>/dev/null || true

# Build API
COPY apps/api/src        ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
RUN npm run build -w @allo-joy/api

# ── Stage 2 : production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Deps runtime seulement
COPY package.json package-lock.json ./
COPY packages/types/package.json    ./packages/types/
COPY apps/api/package.json          ./apps/api/
RUN npm ci --omit=dev --ignore-scripts

# Artéfacts de build
COPY --from=builder /app/apps/api/dist          ./apps/api/dist
COPY --from=builder /app/apps/api/prisma        ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma   ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma   ./node_modules/@prisma

# Entrypoint
WORKDIR /app/apps/api
EXPOSE 3000

USER node
CMD ["node", "dist/index.js"]
