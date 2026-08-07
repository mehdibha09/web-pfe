#!/bin/bash
set -e

# Fabric8 KubernetesClient auto-detects the in-cluster configuration from the
# mounted service account token and CA (KUBERNETES_SERVICE_HOST/PORT). No
# kubectl binary is required anymore.

exec java -jar /app/app.jar "$@"