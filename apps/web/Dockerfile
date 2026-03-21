FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/editor-model/package.json packages/editor-model/package.json
COPY packages/editor-renderer/package.json packages/editor-renderer/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/workspace-domain/package.json packages/workspace-domain/package.json
COPY packages/workspace-sdk/package.json packages/workspace-sdk/package.json

RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm --workspace @ai-craft/web run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 8080

CMD ["node", "apps/web/server.js"]
