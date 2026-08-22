# faqchatbot

Embeddable AI Platform multi-tenant para assistentes de IA instalaveis em sites por um unico script.

## Stack

- Monorepo com pnpm workspaces e Turborepo
- API: NestJS, Fastify, Swagger, JWT, Drizzle ORM
- Widget: Lit, Shadow DOM, Typescript, Vite
- Dashboard: React, Typescript, Vite
- Contratos compartilhados: Typescript + Zod
- Agent Router: n8n, OpenAI Responses, LangGraph, Dify, Flowise, CrewAI, MCP e adaptadores custom
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
make build        # inclui gate de tamanho do widget
make verify       # lint + typecheck + test + build
make infra-up     # postgres + redis + minio
make widget-build # build versionado do widget (manifest + hash)
make widget-serve # serve o widget buildado em http://localhost:4173
```

## Apps

- API: `apps/api` - Swagger em http://localhost:3000/docs
- Widget: `apps/widget` (E2E: `pnpm --filter @faqchatbot/widget run test:e2e`)
- Dashboard: `apps/dashboard`
- SDK JS (instalacao programatica): `packages/sdk-js`

## Documentacao

- [Plano de arquitetura](docs/architecture-plan.md)
- [Backlog detalhado](docs/tasks.md)
- [Referencia da API](docs/api.md)
- [Protocolo de mensagens](docs/message-protocol.md)
- [Como criar um adaptador de agente](docs/creating-adapters.md)
- [Deploy local/producao/CDN](docs/deploy.md)
- [Threat model](docs/threat-model.md)

### Runbooks

- [Deploy Kubernetes](docs/runbooks/deploy.md)
- [Rollback](docs/runbooks/rollback.md)
- [Backup e restore](docs/runbooks/backup-restore.md)

### Exemplo de integracao

- [`examples/widget-integration.html`](examples/widget-integration.html)
