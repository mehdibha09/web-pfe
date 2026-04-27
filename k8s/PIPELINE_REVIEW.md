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

### 1. **Frontend Port Configuration Mismatch**

**Problem**: Frontend deployment exposes port 7070, but Ingress routes to port 80

**Fix - Update Jenkinsfile or frontend Dockerfile**:

```yaml
# Option A: Frontend runs on port 80 (recommended)
- containerPort: 80
- Ingress routes to port 80

# Option B: Keep frontend on 7070
- Update all services to use consistent port
- Ingress: port: 7070
```

**Recommended**: Update frontend nginx.conf to listen on port 80 and change deployment accordingly.

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
  requests: cpu: 250m, memory: 512Mi
  limits: cpu: 500m, memory: 1Gi
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

### 8. **Ingress Hostname Configuration**

**Current**: `host: 192.168.56.40` (IP-based routing)
**Problem**: Not production-ready, difficult to manage across environments

**Improvement**:

```yaml
# Option A: Use DNS names
- host: app-pfe.local
  http:
    paths: [...]

# Option B: Parameterize host
- host: ${INGRESS_HOST} # Set via Kustomize/Helm
```

---

### 9. **ImagePullPolicy**

**Fixed in consolidated manifest**: Changed to `Always` ✅

- Ensures latest image is always pulled
- Critical for CI/CD pipelines

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

- [ ] Fix frontend port (80 vs 7070)
- [ ] Add resource requests/limits
- [ ] Update probe configurations
- [ ] Secure database credentials

### Phase 2: Medium-term (Next Sprint)

- [ ] Implement database migrations properly
- [ ] Add StorageClass configuration
- [ ] Set up parameterized Ingress hostnames
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
