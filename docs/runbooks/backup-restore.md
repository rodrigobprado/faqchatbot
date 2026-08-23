# Runbook de Backup e Restore - PostgreSQL

## Politica de backup

- Backup fisico/logico diario do banco `faqchatbot` (retencao minima: 7 dias).
- WAL archiving ou PITR quando o provedor gerenciado permitir.
- Teste de restore trimestral obrigatorio.

## Backup manual (pg_dump)

```bash
kubectl -n faqchatbot get secret faqchatbot-secrets \
  -o jsonpath='{.data.DATABASE_URL}' | base64 -d > /tmp/dburl

kubectl -n faqchatbot run db-backup --rm -i --restart=Never \
  --image=postgres:16-alpine \
  --env="DATABASE_URL=$(cat /tmp/dburl)" \
  -- pg_dump --no-owner --format=custom --file=/tmp/faqchatbot.dump "$DATABASE_URL"

# Copie o dump para armazenamento externo (S3/GCS) imediatamente apos gerar.
rm -f /tmp/dburl
```

Backup via Docker Compose (ambiente local/staging):

```bash
docker compose exec -T postgres \
  pg_dump -U faqchatbot --format=custom faqchatbot > backups/faqchatbot-$(date +%F).dump
```

## Restore

```bash
# 1. Reduza a API para evitar escritas durante o restore
kubectl -n faqchatbot scale deployment/faqchatbot-api --replicas=0

# 2. Restaure
kubectl -n faqchatbot run db-restore --rm -i --restart=Never \
  --image=postgres:16-alpine \
  --env="DATABASE_URL=$(cat /tmp/dburl)" \
  -- pg_restore --clean --if-exists --dbname "$DATABASE_URL" /tmp/faqchatbot.dump

# 3. Volte a API
kubectl -n faqchatbot scale deployment/faqchatbot-api --replicas=2
curl -fsS https://api.faqchatbot.example.com/health
```

Local (Docker Compose):

```bash
docker compose exec -T postgres \
  pg_restore -U faqchatbot --clean --if-exists --dbname faqchatbot < backups/faqchatbot-YYYY-MM-DD.dump
```

## CronJob sugerido (backup diario in-cluster)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: faqchatbot
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:16-alpine
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: faqchatbot-secrets
                      key: DATABASE_URL
              command:
                - /bin/sh
                - -c
                - pg_dump --no-owner --format=custom "$DATABASE_URL" > /backups/faqchatbot-$(date +%F).dump
              volumeMounts:
                - name: backups
                  mountPath: /backups
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: postgres-backups
```

Aplique com `kubectl apply -f <arquivo>.yaml` apos provisionar o PVC `postgres-backups`.
