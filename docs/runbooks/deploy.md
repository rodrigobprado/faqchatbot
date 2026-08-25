# Runbook de Deploy - faqchatbot

## Pre-requisitos

- Cluster Kubernetes com ingress-nginx e cert-manager instalados.
- `kubectl` autenticado no cluster alvo.
- Imagens publicadas no registry (GHCR) com as tags desejadas.
- PostgreSQL e Redis provisionados (gerenciados ou in-cluster).
- Namespace criado: `kubectl apply -f infra/k8s/namespace.yaml`.

## 1. Configurar ambiente

```bash
cp infra/k8s/secrets.example.yaml infra/k8s/secrets.yaml
# Preencher os valores reais. NUNCA comitar o arquivo preenchido.
$EDITOR infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml
```

## 2. Migrar banco

As migrations sao idempotentes e devem rodar ANTES do deploy da nova versao:

```bash
kubectl -n faqchatbot run migrate --rm -i --restart=Never \
  --image=ghcr.io/rigbie/faqchatbot-api:TAG \
  --env="DATABASE_URL=$(kubectl -n faqchatbot get secret faqchatbot-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
  -- node dist/db/migrate.js
```

## 3. Aplicar manifests

```bash
kubectl apply -f infra/k8s/api-deployment.yaml
kubectl apply -f infra/k8s/web-deployments.yaml
kubectl apply -f infra/k8s/api-hpa.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

Para versao especifica, use `kustomize edit set image` ou:

```bash
kubectl -n faqchatbot set image deployment/faqchatbot-api api=ghcr.io/rigbie/faqchatbot-api:TAG
kubectl -n faqchatbot set image deployment/faqchatbot-dashboard dashboard=ghcr.io/rigbie/faqchatbot-dashboard:TAG
kubectl -n faqchatbot set image deployment/faqchatbot-widget widget=ghcr.io/rigbie/faqchatbot-widget:TAG
```

## 4. Verificar

```bash
kubectl -n faqchatbot rollout status deployment/faqchatbot-api
curl -fsS https://api.faqchatbot.example.com/health
curl -fsS https://cdn.faqchatbot.example.com/widget.js
```

Checklist pos-deploy:

1. `/health` responde 200.
2. Widget carrega e inicia sessao em um site de teste.
3. Swagger `https://api.../docs` acessivel.
4. Logs sem erros: `kubectl -n faqchatbot logs deploy/faqchatbot-api --since=5m`.

## 5. Publicar widget na CDN (quando aplicavel)

Push da tag `widget-vX.Y.Z` dispara o workflow `.github/workflows/widget-cdn.yml`,
que sobe `widget.<hash>.js` + `manifest.json` para o bucket da CDN.

## 6. Deploy staging (overlay Kubernetes `reloc-dev`)

O ambiente staging usa os manifests em `infra/k8s/overlays/staging/` (namespace
`reloc-dev`, imagens `ghcr.io/rigbie-sst/faqchatbot-*`). As imagens sao
publicadas pelo workflow `.github/workflows/docker.yml` a cada push em `main`
(tag `staging-<short-sha>` e `latest`).

Pre-requisitos unicos:

```bash
cp infra/k8s/overlays/staging/secrets.example.yaml infra/k8s/overlays/staging/secrets.yaml
# Preencher os valores reais. NUNCA comitar o arquivo preenchido.
$EDITOR infra/k8s/overlays/staging/secrets.yaml
```

O cluster tambem precisa do secret `ghcr-pull-secret` no namespace `reloc-dev`
(credenciais de pull do GHCR) e dos servicos `postgres`, `redis` e `faq-minio`
resolviveis em `reloc-dev.svc.cluster.local`.

Deploy completo (namespace, config, secret, migrate job, API, dashboard e
widget, com espera de rollout):

```bash
scripts/deploy-k8s-staging.sh            # usa o short hash do HEAD
scripts/deploy-k8s-staging.sh staging-abc1234   # tag especifica publicada no GHCR
```

Verificacao manual:

```bash
kubectl -n reloc-dev get pods
curl -fsS http://<host-do-ingress>/health          # API
curl -fsS http://<host-do-ingress>/healthz         # widget
```

Checklist pos-deploy staging:

1. Job `faq-migrate` completo: `kubectl -n reloc-dev get job faq-migrate`.
2. `/health` da API responde 200.
3. Widget carrega e inicia sessao em um site de teste.
