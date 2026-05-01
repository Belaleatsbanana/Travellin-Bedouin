# ─────────────────────────────────────────────
# Stage 1 — Install dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# .npmrc is copied first so retry settings apply to the install that follows
COPY .npmrc* package.json package-lock.json* ./
# npm ci requires a lockfile; npm install generates one if missing.
# Once a package-lock.json is committed, switch back to: npm ci --ignore-scripts
# Cache mount avoids re-downloading packages on every build (esp. under QEMU)
RUN --mount=type=cache,id=npm-$TARGETARCH,target=/root/.npm \
    npm install --ignore-scripts

# ─────────────────────────────────────────────
# Stage 2 — Build the Next.js application
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (these are baked into the JS bundle by Next.js)
# Override at build time: docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com
ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_PUBLIC_MOCK_API=false
ARG NEXT_PUBLIC_USE_SSE=false
ARG NEXT_PUBLIC_POLL_INTERVAL_MS=2000

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_MOCK_API=$NEXT_PUBLIC_MOCK_API
ENV NEXT_PUBLIC_USE_SSE=$NEXT_PUBLIC_USE_SSE
ENV NEXT_PUBLIC_POLL_INTERVAL_MS=$NEXT_PUBLIC_POLL_INTERVAL_MS

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3 — Lean production runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what Next.js standalone output needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
