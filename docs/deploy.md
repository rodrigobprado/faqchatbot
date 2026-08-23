# Deploy local e deploy em producao

## Deploy local (Docker Compose)

```bash
corepack enable
corepack pnpm install
cp .env.example .env

make infra-up          # PostgreSQL :5433, Redis :6379, MinIO :9000
pnpm --filter @faqchatbot/api run db:migrate
pnpm --filter @faqchatbot/api run db:seed   # cria tenant demo + admin
make dev               # API :3000, widget :5173, dashboard :5174
```

Login do dashboard: `admin@faqchatbot.local` / `SEED_ADMIN_PASSWORD` (padrao `change-me-now`).

### Testar o widget ponta a ponta

1. Cadastre um dominio autorizado para o tenant demo no dashboard (ex.: `localhost:4173`).
2. `make widget-serve` sobe o build de producao do widget em `http://localhost:4173`.
3. Abra `examples/widget-integration.html` servido nesse host (ou qualquer pagina que inclua o script apontando `data-agent="demo"` e `data-api-url="http://localhost:3000"`).

### Instalacao programatica (SPAs)

Para aplicacoes de pagina unica, use o SDK em vez do script inline:

```ts
import { loadChatWidget } from "@faqchatbot/sdk-js";

const widget = await loadChatWidget({
  agentId: "demo",
  apiUrl: "https://api.faqchatbot.example.com",
  scriptUrl: "https://cdn.faqchatbot.example.com/widget.js", // opcional
});

widget.open();
widget.send("Ola!");
```

- Idempotente: se `window.ChatWidget` ja existe, reusa a instancia.
- Recusado enquanto um load anterior estiver em andamento (evita scripts duplicados).

## Deploy Kubernetes

Ver `docs/runbooks/deploy.md`. Resumo:

```bash
kubectl apply -f infra/k8s/namespace.yaml
# preencha infra/k8s/secrets.yaml a partir de secrets.example.yaml
kubectl apply -f infra/k8s/configmap.yaml -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/api-deployment.yaml -f infra/k8s/web-deployments.yaml
kubectl apply -f infra/k8s/api-hpa.yaml -f infra/k8s/ingress.yaml
```

- Probes: `/health` na API; estaticos no widget/dashboard.
- HPA: 2-10 replicas por CPU/memoria.
- Rollback: `docs/runbooks/rollback.md`.
- Backup/restore: `docs/runbooks/backup-restore.md`.

## Publicacao do widget (CDN)

O build gera `dist/widget.js`, copia versionada `widget.<hash>.js` e `manifest.json`
(hash, release, timestamp). O gate de tamanho roda junto do build:

```
raw <= 60KB | gzip <= 25KB
```

Publicacao automatica: push da tag `widget-vX.Y.Z` dispara `.github/workflows/widget-cdn.yml`.
Cache busting: hospedeiros devem servir `widget.js` com `no-cache` e `widget.<hash>.js` como `immutable`
(`apps/widget/nginx.conf` ja configura isso).

## CI/CD

| Workflow                      | Disparo         | Etapas                                                                                |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------------- |
| CI (`ci.yml`)                 | PR / push main  | lint, typecheck, migrate, test, e2e (widget + dashboard), build (+ size check), audit |
| Security (`security.yml`)     | PR / semanal    | dependency review, gitleaks. CodeQL pendente de licenca GHAS na organizacao           |
| Widget CDN (`widget-cdn.yml`) | tag `widget-v*` | build + upload S3                                                                     |
