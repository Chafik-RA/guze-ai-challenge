# AI Challenge — BUILD DIFFERENT 2026

Monorepo for the Guze AI Agent Challenge prototype.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 20 (standalone, zoneless) |
| Backend | Express + TypeScript |
| Database | PostgreSQL 16 (Docker) |
| Shared | `@ai-challenge/shared` — API types & error codes |

## Project structure

```
ai-challenge/
├── apps/
│   ├── backend/          # Express API  →  http://localhost:3000
│   └── frontend/         # Angular app  →  http://localhost:4200
├── shared/types/         # Shared TypeScript contracts (FE + BE)
├── doc/                  # Challenge contract (00–11)
├── docker-compose.yml
└── .env.example
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 2. Setup

```bash
cp .env.example .env
npm install
```

### 3. Run with Docker (recommended)

```bash
npm run docker:up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend | http://localhost:3000 |
| Backend health | http://localhost:3000/health |
| DB health | http://localhost:3000/health/db |
| PostgreSQL | localhost:5432 |

### 4. Seed mock data

After Postgres is up (first run applies migrations automatically):

```bash
npm run db:seed
```

Test accounts: `alice@example.test`, `bob@example.test`, `carol@example.test` — password: `Challenge123!`

### 5. Run locally (without Docker)

Terminal 1 — start Postgres only:

```bash
docker compose up postgres -d
```

Terminal 2 — backend:

```bash
npm run dev:backend
```

Terminal 3 — frontend:

```bash
npm run dev:frontend
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev:backend` | Start Express with hot reload |
| `npm run dev:frontend` | Start Angular dev server (with API proxy) |
| `npm run build` | Build backend + frontend |
| `npm run docker:up` | Start all services in Docker |
| `npm run docker:down` | Stop all services |
| `npm run docker:logs` | Tail container logs |
| `npm run db:seed` | Load mock data from `06_MOCK_DATA.md` |

## Shared package

Both apps import types from `@ai-challenge/shared`:

```typescript
import { ErrorCode } from '@ai-challenge/shared/error-codes';
import type { LoginResponse } from '@ai-challenge/shared/api-contract';
```

Source of truth: `doc/build-different-challenge-2026/05_API_CONTRACT.md` and `08_ERROR_STATUS_CATALOG.md`.

## Environment variables

Copy `.env.example` → `.env`. Key values:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (host dev) |
| `SESSION_TOKEN_SECRET` | Auth token signing |
| `API_BASE_URL` | Documented for Angular `environment.ts` |

Inside Docker Compose, backend env vars are set in `docker-compose.yml`.

## Challenge docs

Read in order: `doc/build-different-challenge-2026/00_READ_FIRST.md` → `11_PARTICIPANT_TEST_CASES.md`.
