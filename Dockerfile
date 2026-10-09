# ─────────────────────────────────────────────────────────
# Stage 1: Build the React client
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Install dependencies separately to leverage layer caching
COPY client/package*.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY client/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────
# Stage 2: Build/install server dependencies
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS server-deps

WORKDIR /app/server

COPY server/package*.json ./
# Production dependencies only
RUN npm ci --omit=dev --prefer-offline

# ─────────────────────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: create a non-root user
RUN addgroup -S webisight && adduser -S webisight -G webisight

WORKDIR /app

# Copy server source
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/src ./server/src
COPY server/package.json ./server/package.json

# Copy built client into server's public dir so Express can serve it
COPY --from=client-builder /app/client/dist ./client/dist

# Environment defaults (override at runtime)
ENV NODE_ENV=production
ENV PORT=3001
ENV AUDIT_TIMEOUT_SECONDS=30
ENV RATE_LIMIT_PER_MINUTE=20
ENV MAX_RESPONSE_BYTES=5242880
ENV CACHE_TTL_SECONDS=300

# Switch to non-root user
USER webisight

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

WORKDIR /app/server

CMD ["node", "src/server.js"]
