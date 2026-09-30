FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace backend --include-workspace-root
FROM dependencies AS builder
COPY backend ./backend
# Only to load Prisma configuration at build time; does not connect to a DB.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run prisma:generate --workspace backend
RUN npm run build --workspace backend
RUN npm prune --omit=dev --workspace backend --include-workspace-root
FROM dependencies AS migration
COPY backend/prisma ./backend/prisma
COPY backend/prisma.config.ts ./backend/prisma.config.ts
USER node
CMD ["npm", "run", "prisma:deploy", "--workspace", "backend"]
FROM node:24-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend ./backend
USER node
EXPOSE 3001
CMD ["node", "backend/dist/main.js"]
