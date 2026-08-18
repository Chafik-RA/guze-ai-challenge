# Build context is the REPO ROOT (see docker-compose.yml: context: .)
# Installs from the monorepo root so @ai-challenge/shared resolves via npm workspaces.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm ci

COPY shared/ ./shared/
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["npm", "run", "dev"]
