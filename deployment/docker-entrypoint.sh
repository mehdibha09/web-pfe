#!/bin/bash
set -e

# Configure kubectl for in-cluster access
if [ -n "$KUBERNETES_SERVICE_HOST" ]; then
  API_SERVER="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT:-443}"
  TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null || echo "")
  CA_CRT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

  if [ -n "$TOKEN" ] && [ -f "$CA_CRT" ]; then
    kubectl config set-cluster in-cluster \
      --server="$API_SERVER" \
      --certificate-authority="$CA_CRT" \
      --embed-certs=true >/dev/null 2>&1
    kubectl config set-credentials pod-sa \
      --token="$TOKEN" >/dev/null 2>&1
    kubectl config set-context in-cluster \
      --cluster=in-cluster \
      --user=pod-sa >/dev/null 2>&1
    kubectl config use-context in-cluster >/dev/null 2>&1
    echo "kubeconfig configured for in-cluster access"
  else
    echo "WARNING: In-cluster token or CA not found, kubectl may not work"
  fi
fi

exec java -jar /app/app.jar "$@"
