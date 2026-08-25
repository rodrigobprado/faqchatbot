#!/bin/bash
set -euo pipefail

# Deploy dos manifests Kubernetes de staging (infra/k8s/overlays/staging).
# Renderiza os manifests substituindo IMAGE_TAG_PLACEHOLDER pela tag informada
# e aplica no cluster apontado pelo kubectl atual.
#
# Uso: scripts/deploy-k8s-staging.sh [IMAGE_TAG]
#   IMAGE_TAG padrao: short hash do HEAD atual.

TAG="${1:-$(git rev-parse --short HEAD)}"
OVERLAY_DIR="infra/k8s/overlays/staging"
RENDER_DIR="$(mktemp -d)"
trap 'rm -rf "${RENDER_DIR}"' EXIT

if ! command -v kubectl >/dev/null 2>&1; then
  echo "erro: kubectl nao encontrado no PATH" >&2
  exit 1
fi

for file in namespace configmap api web; do
  sed "s/IMAGE_TAG_PLACEHOLDER/${TAG}/g" \
    "${OVERLAY_DIR}/${file}.yaml" > "${RENDER_DIR}/${file}.yaml"
done

if [ ! -f "${OVERLAY_DIR}/secrets.yaml" ]; then
  echo "erro: ${OVERLAY_DIR}/secrets.yaml nao encontrado." >&2
  echo "crie o secret a partir de ${OVERLAY_DIR}/secrets.example.yaml (NUNCA comitar o preenchido)." >&2
  exit 1
fi

kubectl apply -f "${RENDER_DIR}/namespace.yaml"
kubectl apply -f "${RENDER_DIR}/configmap.yaml"
kubectl apply -f "${OVERLAY_DIR}/secrets.yaml"

echo "aplicando migration (tag ${TAG})..."
sed "s/IMAGE_TAG_PLACEHOLDER/${TAG}/g" \
  "${OVERLAY_DIR}/migrate-job.yaml" > "${RENDER_DIR}/migrate-job.yaml"
kubectl delete job faq-migrate -n reloc-dev --ignore-not-found
kubectl apply -f "${RENDER_DIR}/migrate-job.yaml"
kubectl -n reloc-dev wait --for=condition=complete --timeout=300s job/faq-migrate

kubectl apply -f "${RENDER_DIR}/api.yaml"
kubectl apply -f "${RENDER_DIR}/web.yaml"

kubectl -n reloc-dev rollout status deployment/faq-api --timeout=300s
kubectl -n reloc-dev rollout status deployment/faq-dashboard --timeout=300s
kubectl -n reloc-dev rollout status deployment/faq-widget --timeout=300s

echo "deploy staging concluido (tag ${TAG})."
