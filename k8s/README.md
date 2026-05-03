# Kubernetes Deployment Configuration

This directory contains Kubernetes manifests for deploying the app-pfe application.

## 📌 Overview

Kubernetes resources for the app-pfe application are organized into separate manifest files for easier management:

- **namespace.yaml** - Namespace definition
- **authService.yaml** - AuthService (connects to external PostgreSQL)
- **frontend.yaml** - Frontend UI (NodePort) + Ingress

## 📁 Directory Structure

```
k8s/
├── namespace.yaml              # Kubernetes namespace definition
├── authService.yaml            # AuthService (with PostgreSQL, ConfigMap, Secret)
├── frontend.yaml               # Frontend (with Deployment, Service, Ingress)
├── all-resources.yaml          # Optional consolidated manifest (manual use)
├── README.md                   # This file
├── PIPELINE_REVIEW.md          # Detailed review & recommendations
└── (no legacy subfolders)
```

## 🚀 Quick Start

### Deploy All Resources (Recommended)

```bash
# Deploy in order
kubectl apply -f namespace.yaml
kubectl apply -f authService.yaml
kubectl apply -f frontend.yaml

# Or deploy all at once
kubectl apply -f namespace.yaml authService.yaml frontend.yaml

# Verify deployment
kubectl get all -n app-pfe

# Access
# - Auth service is exposed via NodePort (replace <node-ip> with your cluster node IP)
curl http://<node-ip>:30707/actuator/health

# - Frontend + API are exposed via Ingress (replace <ingress-ip-or-dns> with your ingress controller address)
curl http://<ingress-ip-or-dns>/
curl http://<ingress-ip-or-dns>/api/v1
```

### What Gets Deployed

The separate manifest files include:

1. **namespace.yaml**: `app-pfe` namespace for isolation

2. **authService.yaml** contains:
   - ConfigMap: `backend-config` (Spring profiles and database config)

- Secret: `postgres-secret` (Database credentials)
- Service + EndpointSlice: `postgres` (points to external DB)
- Deployment: auth-service
- Service: auth-service

3. **frontend.yaml** contains:
   - Deployment: frontend web UI
   - Service: frontend

- Ingress: `app-pfe-ingress`

> Note: Ingress `spec.rules[].host` must be a DNS name (or omitted). Do not set it to an IP address.

## 🎯 Images

- Backend: `192.168.56.30/auth-service:latest`
- Frontend: `192.168.56.30/expense-frontend:latest`

## 🔐 Security Notes

⚠️ **Important**: Database credentials in secrets should not be committed to Git in production.

### Better Approaches:

```bash
# Option 1: Create secret separately using kubectl
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=auth_user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  -n app-pfe

# Option 2: Use external secret management (Vault, AWS Secrets Manager)
# Implement using External Secrets Operator (ESO)

# Option 3: Use sealed-secrets for GitOps
# Install: kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/...
```

## 📋 Validation & Testing

### Dry Run (No Changes)

```bash
kubectl apply -f namespace.yaml -f authService.yaml -f frontend.yaml --dry-run=client
```

### View All Resources

```bash
kubectl get all -n app-pfe -o wide
```

### Check Pod Status

```bash
# Watch deployment rollout
kubectl rollout status deployment/auth-service -n app-pfe
kubectl rollout status deployment/frontend -n app-pfe

# View pod logs
kubectl logs -n app-pfe deployment/auth-service -f
kubectl logs -n app-pfe deployment/frontend -f

# Check events
kubectl describe pod -n app-pfe <pod-name>
```

### Test Connectivity

```bash
# NodePort access (replace <node-ip> with your cluster node IP)
curl http://<node-ip>:30707/actuator/health

# Ingress access (replace <ingress-ip-or-dns> with your ingress controller address)
curl http://<ingress-ip-or-dns>/
curl http://<ingress-ip-or-dns>/api/v1
```

## 🔄 Updates & Changes

### Update a Specific Resource

```bash
# Edit and apply just one service
kubectl set image deployment/auth-service \
  -n app-pfe \
  auth-service=192.168.56.30/auth-service:v2.0
```

### Rollback a Deployment

```bash
kubectl rollout undo deployment/auth-service -n app-pfe
```

### Delete All Resources

```bash
kubectl delete -f frontend.yaml -f authService.yaml -f namespace.yaml
```

## 📊 Resource Limits

Current resource allocation:

| Service      | CPU Request | Memory Request | CPU Limit | Memory Limit |
| ------------ | ----------- | -------------- | --------- | ------------ |
| auth-service | 250m        | 256Mi          | 500m      | 512Mi        |
| frontend     | 100m        | 128Mi          | 200m      | 256Mi        |

PostgreSQL is external in this setup and is not managed by these manifests.

## 🛠️ Troubleshooting

### PostgreSQL Connection Issues

```bash
# Verify the Service/Endpoints that point to the external DB
kubectl get svc postgres -n app-pfe -o wide
kubectl get endpointslice -n app-pfe -l kubernetes.io/service-name=postgres -o yaml
```

### Service to Service Communication

```bash
# Test connectivity to external DB from inside the cluster
kubectl run -it --rm -n app-pfe pg-check \
  --image=postgres:16-alpine \
  --restart=Never \
  -- sh -lc 'pg_isready -h postgres -p 5432'

# Check service DNS
kubectl get svc -n app-pfe
```

### Image Pull Errors

```bash
# Verify nexus-regcred secret exists
kubectl get secrets -n app-pfe

# Check image availability
docker login 192.168.56.30
docker pull 192.168.56.30/auth-service:latest
```

## 🔧 Configuration Management

### Updating ConfigMap Data

```bash
# Edit inline
kubectl edit configmap backend-config -n app-pfe

# Or update YAML and apply
# Then restart pods to pick up changes:
kubectl rollout restart deployment/auth-service -n app-pfe
```

### Updating Secrets

```bash
# Delete and recreate (temporary solution)
kubectl delete secret postgres-secret -n app-pfe
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=auth_user \
  --from-literal=POSTGRES_PASSWORD=<new-password> \
  -n app-pfe

# Restart app to reload env vars from Secret
kubectl rollout restart deployment/auth-service -n app-pfe
```

## 📈 Next Steps

See [PIPELINE_REVIEW.md](./PIPELINE_REVIEW.md) for detailed recommendations on:

- Database migrations setup
- StorageClass configuration
- Health endpoint improvements
- Monitoring integration
- Production hardening

## 🚨 Known Issues & TODO

- [ ] Fix frontend port configuration (ensure nginx listens on port 80)
- [ ] Implement proper database migrations (Flyway/Liquibase)
- [ ] Add StorageClass specification for PostgreSQL
- [ ] Implement health check endpoints for frontend
- [ ] Migrate credentials to external secret management
- [ ] Set up Helm charts for better reusability
- [ ] Implement Network Policies for security
