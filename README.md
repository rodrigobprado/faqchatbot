# faqchatbot

Embeddable AI Platform multi-tenant para assistentes de IA instalaveis em sites por um unico script.

## Stack

- Monorepo com pnpm workspaces e Turborepo
- API: NestJS, Fastify, Swagger, JWT-ready
- Widget: Lit, Shadow DOM, Typescript, Vite
- Dashboard: React, Typescript, Vite
- Contratos compartilhados: Typescript + Zod
- Infra local: PostgreSQL, Redis e MinIO via Docker Compose

## Requisitos

- Node.js 24+
- Corepack
- Docker e Docker Compose

## Setup

```bash
corepack enable
corepack pnpm install
cp .env.example .env
make dev
```

## Comandos

```bash
make lint
make typecheck
make test
make build
make verify
```

## Apps

- API: `apps/api`
- Widget: `apps/widget`
- Dashboard: `apps/dashboard`

## Documentacao

- [Plano de arquitetura](docs/architecture-plan.md)
- [Backlog detalhado](docs/tasks.md)

