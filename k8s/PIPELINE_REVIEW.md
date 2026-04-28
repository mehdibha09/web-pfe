# Pipeline Review & Recommendations

## Current State Analysis

### ✅ What's Working Well

1. **Change Detection** - Smart detection of which services changed using git diff
2. **Conditional Execution** - Only builds/deploys services with actual changes
3. **Namespace Isolation** - All resources in `app-pfe` namespace
4. **Multi-agent Setup** - Separate agents for k8s, security, build tasks
5. **Security Focus** - Plans for Trivy and OWASP ZAP scanning (currently commented)

---

## 🔴 Issues & Recommendations

### 1. **Frontend Port Configuration**

**Status**: Frontend is aligned to port 80 and exposed via NodePort.

```yaml
# Frontend runs on port 80
- containerPort: 80

# Service exposes NodePort
- nodePort: 30080
```

**Recommended**: Keep nginx.conf listening on port 80.

---

### 2. **Resource Requests/Limits Missing**

**Problem**: No CPU/Memory requests or limits defined in backend deployment

**Why It Matters**:

- Pod scheduling issues in resource-constrained clusters
- Potential OOMKilled pods without limits
- No QoS guarantees

**Recommended Limits** (added to consolidated manifest):

```yaml
auth-service:
  requests: cpu: 250m, memory: 256Mi
  limits: cpu: 500m, memory: 512Mi

frontend:
  requests: cpu: 100m, memory: 128Mi
  limits: cpu: 200m, memory: 256Mi

PostgreSQL:
  (external) managed outside the cluster
```

---

### 3. **Database Credentials in Plain Text**

**Problem**: Credentials hardcoded in postgres-secret.yaml

- `auth_user` / `auth_password` are weak and exposed in Git

**Security Fix**:

```bash
# Generate strong credentials
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Create secret from encrypted source
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=auth_user \
  --from-literal=POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  --docker-email=devnull@example.com \
  --dry-run=client -o yaml | kubectl apply -f -

# OR: Use Azure Key Vault / HashiCorp Vault
```

**Also**: Add `.env` files to `.gitignore` to prevent credential leaks.

---

### 4. **Missing Image Pull Secrets in Deployments**

**Fixed in consolidated manifest** ✅

```yaml
imagePullSecrets:
  - name: nexus-regcred
```

---

### 5. **Probe Configuration Issues**

**Current**: Auth service probes hit `/actuator/health` ✅
**Missing**: Frontend has no health endpoint check

**Recommendation**:

```yaml
frontend:
  readinessProbe:
    httpGet:
      path: / # or /health if available
      port: 80
    initialDelaySeconds: 10
    periodSeconds: 10
```

---

### 6. **StatefulSet Storage Class**

**Problem**: No StorageClass specified, uses default
**Risk**: Data loss if default SC doesn't support persistence

**Improvement**:

```yaml
volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      storageClassName: 'standard' # or "fast-ssd"
      accessModes: ['ReadWriteOnce']
      resources:
        requests:
          storage: 5Gi
```

---

### 7. **Database Initialization**

**Current**: Pipeline creates databases manually with psql
**Problem**: Shell script doesn't run database migrations (Flyway/Liquibase)

**Recommendation**: Use init container or Job:

```yaml
initContainers:
  - name: db-migrate
    image: postgres:16-alpine
    command:
      - sh
      - -c
      - |
        psql -h postgres -U auth_user -d auth_service \
          -f /migrations/init.sql
    volumeMounts:
      - name: migrations
        mountPath: /migrations
volumes:
  - name: migrations
    configMap:
      name: db-migrations
```

---

### 8. **Service Exposure (NodePort)**

**Current**: Services are exposed via NodePort (no Ingress)
**Notes**: Simple for local/dev; for production, prefer an Ingress/LoadBalancer with DNS.

---

### 9. **ImagePullPolicy**

**Current**: `IfNotPresent`

- Works well when you deploy immutable tags (e.g., `${BUILD_NUMBER}`) as the pipeline does.

---

### 10. **Monitoring Configuration**

**Current**: Monitoring applied via `kubectl apply -f ../monitoring/`
**Problem**:

- Tightly coupled to k8s directory structure
- Better to integrate into monitoring service

**Alternative**: Use Helm or Kustomize for modular deployments.

---

## 🎯 Implementation Roadmap

### Phase 1: Immediate Fixes (This Sprint)

- [x] Fix frontend port (80 vs 7070)
- [ ] Add resource requests/limits
- [ ] Update probe configurations
- [ ] Secure database credentials

### Phase 2: Medium-term (Next Sprint)

- [ ] Implement database migrations properly
- [ ] Add StorageClass configuration (only if you run stateful workloads)
- [ ] Implement health check endpoints

### Phase 3: Long-term (Stabilization)

- [ ] Migrate to Helm charts for reusability
- [ ] Implement GitOps with ArgoCD/Flux
- [ ] Add Pod Disruption Budgets (PDB)
- [ ] Configure Network Policies
- [ ] Add RBAC policies

---

## 📋 Consolidated Resources Benefits

✅ **Single File Deployment**: One `kubectl apply -f all-resources.yaml` instead of multiple commands
✅ **Easier Version Control**: All resources tracked together
✅ **Simpler Troubleshooting**: See all dependencies in one place
✅ **Reduced Complexity**: Fewer scripts to manage
✅ **Better Dependency Management**: Clear ordering (namespace → config → deployments)

---

## 🔍 Validation Commands

```bash
# Validate consolidated YAML
kubectl apply -f all-resources.yaml --dry-run=client

# Check current deployments
kubectl get deployments -n app-pfe -o wide

# View all resources in namespace
kubectl get all -n app-pfe

# Check pod logs
kubectl logs -n app-pfe deployment/auth-service -f

# Test endpoint
kubectl port-forward -n app-pfe svc/auth-service 7070:7070
curl localhost:7070/actuator/health
```

---

## 📌 Next Steps

1. **Review & Test**: Validate consolidated manifest in dev environment
2. **Update Pipeline**: Pipeline now references `all-resources.yaml` ✅
3. **Implement Fixes**: Address issues in Phase 1
4. **Document**: Create runbooks for deployment troubleshooting
5. **Monitor**: Set up alerts for failed deployments and pod crashes
