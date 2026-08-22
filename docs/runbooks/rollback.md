# Runbook de Rollback - faqchatbot

## Quando acionar

- Erro 5xx crescente apos deploy.
- Health check instavel pos-deploy.
- Regressao funcional critica reportada pelo suporte.

## Rollback da API

```bash
kubectl -n faqchatbot rollout undo deployment/faqchatbot-api
kubectl -n faqchatbot rollout status deployment/faqchatbot-api
```

Para versao especifica:

```bash
kubectl -n faqchatbot set image deployment/faqchatbot-api \
  api=ghcr.io/rigbie/faqchatbot-api:TAG_ANTERIOR
kubectl -n faqchatbot rollout status deployment/faqchatbot-api
```

## Rollback do dashboard/widget

```bash
kubectl -n faqchatbot rollout undo deployment/faqchatbot-dashboard
kubectl -n faqchatbot rollout undo deployment/faqchatbot-widget
```

## Rollback do widget na CDN

O `manifest.json` publicado aponta para `widget.<hash>.js`. Para reverter:

1. Reaponte o `manifest.json` do bucket para o hash anterior:

```bash
aws s3 cp s3://$S3_BUCKET/widget/manifest.json ./manifest.json --endpoint-url $S3_ENDPOINT
# edite versionedFile/hash para a versao anterior e reenvie
aws s3 cp ./manifest.json s3://$S3_BUCKET/widget/manifest.json \
  --cache-control "no-cache" --endpoint-url $S3_ENDPOINT
```

2. Widgets ja carregados continuam funcionando com o bundle anterior ate expirar a sessao (JWT de 1h).

## Rollback de banco

Migrations sao append-only. Em caso de incompatibilidade da nova API:

1. Faça rollback da API primeiro (passo acima).
2. Avalie com o time se a migration precisa ser revertida; prefira uma nova migration de correcao a um down em producao.
3. Restore completo apenas como ultimo recurso: ver `backup-restore.md`.

## Verificacao final

```bash
curl -fsS https://api.faqchatbot.example.com/health
kubectl -n faqchatbot get pods
```
