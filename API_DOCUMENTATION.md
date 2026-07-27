# API Documentation

Full-stack deployment platform — API reference for all services.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [Auth Service (port 7070)](#auth-service)
  - [Auth](#auth)
  - [Users](#users)
  - [Roles](#roles)
  - [Permissions](#permissions)
  - [Tenants](#tenants)
  - [Sessions](#sessions)
  - [Audit Logs](#audit-logs)
- [Deployment Service (port 8081)](#deployment-service)
  - [Services](#services)
  - [Environments](#environments)
  - [Service Environments](#service-environments)
  - [Deployments](#deployments)
  - [Virtual Machines](#virtual-machines)
  - [Metrics](#metrics)
  - [Backups](#backups)
  - [Kubernetes](#kubernetes)
  - [WebSocket](#websocket)
  - [Test](#test)
- [Cloud Pricer Service (port 8085)](#cloud-pricer-service)
  - [Cost Records](#cost-records)
  - [Cost Forecasts](#cost-forecasts)
  - [Cost Aggregation](#cost-aggregation)
  - [Quotas](#quotas)
  - [Alerts](#alerts)
  - [Automatic Alert Generation](#automatic-alert-generation-cron-job)
- [Notifications (Deployment Service)](#notifications-deployment-service-port-8081)
  - [Notification Endpoints](#notification-endpoints)

---

## Architecture Overview

| Component | Direct Port | Gateway Port | K8s NodePort | Docker Image |
|-----------|-------------|--------------|--------------|--------------|
| Gateway (Spring Cloud Gateway) | 6060 | 6060 | 30060 | `192.168.56.30/gateway:latest` |
| Auth Service | 7070 | via 6060 | 30707 | `192.168.56.30/auth-service:latest` |
| Deployment Service | 8081 | via 6060 | 30811 | `192.168.56.30/deployment-service:latest` |
| Cloud Pricer Service | 8090 | via 6060 | 30890 | `192.168.56.30/cloud-pricer-service:latest` |

All HTTP endpoints are accessible through the gateway at `http://localhost:6060`.

### K8s Manifests

| File | Description |
|------|-------------|
| `k8s/namespace.yaml` | `app-pfe` namespace |
| `k8s/all-resources.yaml` | Postgres, ConfigMap, auth-service (combined) |
| `k8s/authService.yaml` | Auth service Deployment + Service |
| `k8s/deploymentService.yaml` | Deployment service Deployment + Service |
| `k8s/cloudPricerService.yaml` | Cloud Pricer service Deployment + Service |
| `k8s/gatewayService.yaml` | Gateway Deployment + Service |
| `k8s/frontend.yaml` | Frontend (Nginx) Deployment + Service |

### Dockerfiles

| Service | Path | Base Port |
|---------|------|-----------|
| Auth | `authService/Dockerfile` | 7070 |
| Deployment | `deployment/Dockerfile` | 8081 |
| Cloud Pricer | `cloudPricer/Dockerfile` | 8090 |
| Gateway | `gateway/Dockerfile` | 6060 |
| Frontend | `frontend/Dockerfile` | 80 (Nginx) |

---

## Authentication

Most endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token via `POST /api/v1/auth/login`.

---

## Auth Service

Base URL (direct): `http://localhost:7070`  
Base URL (gateway): `http://localhost:6060`

### Auth

#### `POST /api/v1/auth/login`

Authenticate a user and receive a JWT token.

**Request body:**

```json
{
    "email": "user@example.com",
    "password": "secret123"
}
```

**Response:** `200 OK`

```json
{
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "name": "John Doe"
    }
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

---

#### `POST /api/v1/auth/register`

Register a new user account.

**Request body:**

```json
{
    "email": "newuser@example.com",
    "password": "secret123",
    "name": "Jane Doe"
}
```

**Response:** `201 Created`

```json
{
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "name": "Jane Doe"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"secret123","name":"Jane Doe"}'
```

---

#### `POST /api/v1/auth/logout`

Invalidate the current session token.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/auth/refresh`

Refresh an expired access token using a refresh token.

**Request body:**

```json
{
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response:** `200 OK`

```json
{
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "dGhpcyBpcyBhIG5ldyByZWZy..."
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"dGhpcyBpcyBhIHJlZnJl..."}'
```

---

### Users

#### `GET /api/v1/users`

List all users.

**Response:** `200 OK`

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "name": "John Doe",
        "roles": ["ADMIN"]
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/users`

Create a new user.

**Request body:**

```json
{
    "email": "newuser@example.com",
    "password": "secret123",
    "name": "Jane Doe",
    "roleIds": ["550e8400-e29b-41d4-a716-446655440010"]
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"email":"newuser@example.com","password":"secret123","name":"Jane Doe","roleIds":["550e8400-e29b-41d4-a716-446655440010"]}'
```

---

#### `GET /api/v1/users/{id}`

Get a user by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/users/{id}`

Update an existing user.

**Request body:**

```json
{
    "name": "Updated Name",
    "email": "updated@example.com",
    "roleIds": ["550e8400-e29b-41d4-a716-446655440010"]
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"Updated Name","email":"updated@example.com"}'
```

---

#### `DELETE /api/v1/users/{id}`

Delete a user.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Roles

#### `GET /api/v1/roles`

List all roles.

**Response:** `200 OK`

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "ADMIN",
        "permissions": ["USER_READ", "USER_WRITE"]
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/roles`

Create a new role.

**Request body:**

```json
{
    "name": "OPERATOR",
    "permissionIds": ["550e8400-e29b-41d4-a716-446655440020"]
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"OPERATOR","permissionIds":["550e8400-e29b-41d4-a716-446655440020"]}'
```

---

#### `PUT /api/v1/roles/{id}`

Update a role.

**Request body:**

```json
{
    "name": "SUPER_ADMIN",
    "permissionIds": ["550e8400-e29b-41d4-a716-446655440020"]
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/roles/550e8400-e29b-41d4-a716-446655440010 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"SUPER_ADMIN"}'
```

---

#### `DELETE /api/v1/roles/{id}`

Delete a role.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/roles/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Permissions

#### `GET /api/v1/permissions`

List all permissions.

**Response:** `200 OK`

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "USER_READ",
        "description": "Can read user data"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/permissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/permissions`

Create a new permission.

**Request body:**

```json
{
    "name": "VM_MANAGE",
    "description": "Can manage virtual machines"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"VM_MANAGE","description":"Can manage virtual machines"}'
```

---

### Tenants

#### `GET /api/v1/tenants`

List all tenants.

**Response:** `200 OK`

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "name": "Acme Corp"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/tenants \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/tenants`

Create a new tenant.

**Request body:**

```json
{
    "name": "New Tenant"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"New Tenant"}'
```

---

### Sessions

#### `GET /api/v1/sessions`

List all active sessions.

**Response:** `200 OK`

```json
[
    {
        "id": "sess-001",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "createdAt": "2025-01-15T10:30:00Z",
        "expiresAt": "2025-01-15T22:30:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Audit Logs

#### `GET /api/v1/audit-logs`

List audit log entries.

**Response:** `200 OK`

```json
[
    {
        "id": "log-001",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "action": "LOGIN",
        "timestamp": "2025-01-15T10:30:00Z",
        "details": "User logged in successfully"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/audit-logs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

## Deployment Service

Base URL (direct): `http://localhost:8081`  
Base URL (gateway): `http://localhost:6060`

### Services

#### `GET /api/v1/services`

List all services.

**Response:** `200 OK`

```json
[
    {
        "id": "svc-001",
        "name": "nginx-proxy",
        "description": "Reverse proxy",
        "createdAt": "2025-01-10T08:00:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/services \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/services`

Create a new service.

**Request body:**

```json
{
    "name": "nginx-proxy",
    "description": "Reverse proxy"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"nginx-proxy","description":"Reverse proxy"}'
```

---

#### `GET /api/v1/services/{id}`

Get a service by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/services/svc-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/services/{id}`

Update a service.

**Request body:**

```json
{
    "name": "nginx-proxy-v2",
    "description": "Updated reverse proxy"
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/services/svc-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"nginx-proxy-v2","description":"Updated reverse proxy"}'
```

---

#### `DELETE /api/v1/services/{id}`

Delete a service.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/services/svc-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `POST /api/v1/services/{id}/start`

Start a service's containers across all environments.

**Response:** `200 OK`

```json
{
    "status": "STARTING",
    "message": "Service start initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/services/svc-001/start \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `POST /api/v1/services/{id}/stop`

Stop a service's containers across all environments.

**Response:** `200 OK`

```json
{
    "status": "STOPPING",
    "message": "Service stop initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/services/svc-001/stop \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `POST /api/v1/services/{id}/restart`

Restart a service's containers across all environments.

**Response:** `200 OK`

```json
{
    "status": "RESTARTING",
    "message": "Service restart initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/services/svc-001/restart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Environments

#### `GET /api/v1/environments`

List all environments.

**Response:** `200 OK`

```json
[
    {
        "id": "env-001",
        "name": "production",
        "description": "Production environment"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/environments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/environments`

Create a new environment.

**Request body:**

```json
{
    "name": "staging",
    "description": "Staging environment"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/environments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"staging","description":"Staging environment"}'
```

---

#### `GET /api/v1/environments/{id}`

Get an environment by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/environments/env-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/environments/{id}`

Update an environment.

**Request body:**

```json
{
    "name": "production-us-east",
    "description": "US East production"
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/environments/env-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"production-us-east","description":"US East production"}'
```

---

#### `DELETE /api/v1/environments/{id}`

Delete an environment.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/environments/env-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Service Environments

#### `GET /api/v1/service-environments`

List all service-environment relations.

**Response:** `200 OK`

```json
[
    {
        "id": "se-001",
        "serviceId": "svc-001",
        "environmentId": "env-001",
        "status": "RUNNING"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/service-environments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/service-environments`

Create a new service-environment relation.

**Request body:**

```json
{
    "serviceId": "svc-001",
    "environmentId": "env-001"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/service-environments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"serviceId":"svc-001","environmentId":"env-001"}'
```

---

#### `GET /api/v1/service-environments/{id}`

Get a service-environment relation by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/service-environments/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/service-environments/{id}`

Update a service-environment relation.

**Request body:**

```json
{
    "status": "STOPPED"
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/service-environments/se-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"status":"STOPPED"}'
```

---

#### `DELETE /api/v1/service-environments/{id}`

Delete a service-environment relation.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/service-environments/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Deployments

#### `GET /api/v1/deployments`

List all deployments.

**Response:** `200 OK`

```json
[
    {
        "id": "dep-001",
        "serviceEnvironmentId": "se-001",
        "status": "SUCCESS",
        "createdAt": "2025-01-15T12:00:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/deployments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/deployments`

Create a new deployment.

**Request body:**

```json
{
    "serviceEnvironmentId": "se-001",
    "config": {
        "image": "nginx:latest",
        "replicas": 2
    }
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"serviceEnvironmentId":"se-001","config":{"image":"nginx:latest","replicas":2}}'
```

---

#### `GET /api/v1/deployments/{id}`

Get a deployment by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/deployments/dep-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/deployments/{id}`

Update a deployment.

**Request body:**

```json
{
    "config": {
        "image": "nginx:1.25",
        "replicas": 3
    }
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/deployments/dep-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"config":{"image":"nginx:1.25","replicas":3}}'
```

---

#### `DELETE /api/v1/deployments/{id}`

Delete a deployment.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/deployments/dep-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `POST /api/v1/deployments/{id}/redeploy`

Redeploy an existing deployment with its current configuration.

**Response:** `200 OK`

```json
{
    "id": "dep-002",
    "status": "PENDING",
    "message": "Redeployment initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/deployments/dep-001/redeploy \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Virtual Machines

#### `GET /api/v1/vms`

List all virtual machines.

**Response:** `200 OK`

```json
[
    {
        "id": "vm-001",
        "name": "web-server-01",
        "status": "RUNNING",
        "serviceEnvironmentId": "se-001",
        "ipAddress": "192.168.1.10"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/vms`

Create a new virtual machine.

**Request body:**

```json
{
    "name": "db-server-01",
    "serviceEnvironmentId": "se-001",
    "spec": {
        "cpu": 2,
        "memory": 4096,
        "disk": 50
    }
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/vms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"db-server-01","serviceEnvironmentId":"se-001","spec":{"cpu":2,"memory":4096,"disk":50}}'
```

---

#### `GET /api/v1/vms/{id}`

Get a VM by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/vm-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `PUT /api/v1/vms/{id}`

Update a VM.

**Request body:**

```json
{
    "name": "web-server-01-updated",
    "spec": {
        "cpu": 4,
        "memory": 8192
    }
}
```

**Response:** `200 OK`

**Example:**

```bash
curl -X PUT http://localhost:6060/api/v1/vms/vm-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"web-server-01-updated","spec":{"cpu":4,"memory":8192}}'
```

---

#### `DELETE /api/v1/vms/{id}`

Delete a VM.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/vms/vm-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/vms/service-environment/{serviceEnvironmentId}`

List all VMs for a given service environment.

**Response:** `200 OK`

```json
[
    {
        "id": "vm-001",
        "name": "web-server-01",
        "status": "RUNNING",
        "ipAddress": "192.168.1.10"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/service-environment/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/vms/{id}/start`

Start a virtual machine.

**Response:** `200 OK`

```json
{
    "status": "STARTING",
    "message": "VM start initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/vms/vm-001/start \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/vms/{id}/stop`

Stop a virtual machine.

**Response:** `200 OK`

```json
{
    "status": "STOPPING",
    "message": "VM stop initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/vms/vm-001/stop \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/vms/{id}/restart`

Restart a virtual machine.

**Response:** `200 OK`

```json
{
    "status": "RESTARTING",
    "message": "VM restart initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/vms/vm-001/restart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/vms/{id}/status`

Get the current status of a VM.

**Response:** `200 OK`

```json
{
    "vmId": "vm-001",
    "status": "RUNNING",
    "uptime": "3d 12h 45m"
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/vm-001/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/vms/{id}/metrics`

Get current metrics for a VM (CPU, RAM, network, disk).

**Response:** `200 OK`

```json
{
    "vmId": "vm-001",
    "cpuUsage": 45.2,
    "ramUsage": 62.8,
    "networkUsage": 1024000,
    "diskUsage": 34.5
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/vm-001/metrics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/vms/{id}/ssh/execute`

Execute a command on a VM via SSH.

**Request body:**

```json
{
    "command": "ls -la /var/log"
}
```

**Response:** `200 OK`

```json
{
    "output": "total 128\ndrwxr-xr-x 10 root root  4096 Jan 15 10:30 .\n...",
    "exitCode": 0
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/vms/vm-001/ssh/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"command":"ls -la /var/log"}'
```

---

#### `GET /api/v1/vms/{id}/ssh/info`

Get SSH connection info for a VM.

**Response:** `200 OK`

```json
{
    "vmId": "vm-001",
    "host": "192.168.1.10",
    "port": 22,
    "user": "root"
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/vm-001/ssh/info \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/vms/{id}/ssh/key`

Get the SSH public key for a VM.

**Response:** `200 OK`

```json
{
    "vmId": "vm-001",
    "publicKey": "ssh-rsa AAAAB3NzaC1yc2E..."
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/vms/vm-001/ssh/key \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/vms/{id}/metrics/stream`

Stream real-time VM metrics via Server-Sent Events (SSE).

**Response:** `200 OK` (SSE stream)

```
data: {"cpuUsage":45.2,"ramUsage":62.8,"networkUsage":1024000,"diskUsage":34.5,"timestamp":"2025-01-15T12:00:00Z"}

data: {"cpuUsage":43.1,"ramUsage":63.0,"networkUsage":1028000,"diskUsage":34.5,"timestamp":"2025-01-15T12:00:05Z"}
```

**Example:**

```bash
curl -N http://localhost:6060/api/v1/vms/vm-001/metrics/stream \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Metrics

#### `GET /api/v1/metrics`

List all metrics.

**Response:** `200 OK`

```json
[
    {
        "id": "met-001",
        "serviceEnvironmentId": "se-001",
        "cpuUsage": 45.2,
        "ramUsage": 62.8,
        "networkUsage": 1024000,
        "diskUsage": 34.5,
        "pods": 3,
        "createdAt": "2025-01-15T12:00:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/metrics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/metrics`

Create a new metric record.

**Request body:**

```json
{
    "serviceEnvironmentId": "se-001",
    "cpuUsage": 45.2,
    "ramUsage": 62.8,
    "networkUsage": 1024000,
    "diskUsage": 34.5,
    "pods": 3
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"serviceEnvironmentId":"se-001","cpuUsage":45.2,"ramUsage":62.8,"networkUsage":1024000,"diskUsage":34.5,"pods":3}'
```

---

#### `GET /api/v1/metrics/{id}`

Get a metric by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/metrics/met-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/metrics/latest/{serviceEnvironmentId}`

Get the latest metric for a service environment.

**Response:** `200 OK`

```json
{
    "id": "met-005",
    "serviceEnvironmentId": "se-001",
    "cpuUsage": 48.1,
    "ramUsage": 64.2,
    "networkUsage": 1048000,
    "diskUsage": 35.0,
    "pods": 3,
    "createdAt": "2025-01-15T12:05:00Z"
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/metrics/latest/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/metrics/service-environment/{serviceEnvironmentId}`

List all metrics for a specific service environment.

**Response:** `200 OK`

```json
[
    {
        "id": "met-001",
        "serviceEnvironmentId": "se-001",
        "cpuUsage": 45.2,
        "ramUsage": 62.8,
        "createdAt": "2025-01-15T12:00:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/metrics/service-environment/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `GET /api/v1/metrics/summary/{serviceEnvironmentId}`

Get aggregated metric summary for a service environment.

**Response:** `200 OK`

```json
{
    "cpuUsage": 42.5,
    "ramUsage": 58.3,
    "networkUsage": 980000,
    "diskUsage": 33.2,
    "pods": 3
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/metrics/summary/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/metrics/stream/{serviceEnvironmentId}`

Stream real-time metrics via Server-Sent Events (SSE) for a service environment.

**Response:** `200 OK` (SSE stream)

```
data: {"id":"met-006","serviceEnvironmentId":"se-001","cpuUsage":45.2,"ramUsage":62.8,"networkUsage":1024000,"diskUsage":34.5,"pods":3,"createdAt":"2025-01-15T12:05:05Z"}

data: {"id":"met-007","serviceEnvironmentId":"se-001","cpuUsage":43.1,"ramUsage":63.0,"networkUsage":1028000,"diskUsage":34.5,"pods":3,"createdAt":"2025-01-15T12:05:10Z"}
```

**Example:**

```bash
curl -N http://localhost:6060/api/v1/metrics/stream/se-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Backups

#### `GET /api/v1/backups`

List all backups.

**Response:** `200 OK`

```json
[
    {
        "id": "bak-001",
        "serviceEnvironmentId": "se-001",
        "status": "COMPLETED",
        "size": 104857600,
        "createdAt": "2025-01-15T02:00:00Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/backups \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/backups`

Create a new backup.

**Request body:**

```json
{
    "serviceEnvironmentId": "se-001",
    "description": "Daily backup"
}
```

**Response:** `201 Created`

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/backups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"serviceEnvironmentId":"se-001","description":"Daily backup"}'
```

---

#### `GET /api/v1/backups/{id}`

Get a backup by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/backups/bak-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `DELETE /api/v1/backups/{id}`

Delete a backup.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/backups/bak-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### `POST /api/v1/backups/{id}/restore`

Restore a backup.

**Response:** `200 OK`

```json
{
    "status": "RESTORING",
    "message": "Backup restore initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/backups/bak-001/restore \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### Kubernetes

#### [NEW] `POST /api/v1/k8s/deployments`

Create a Kubernetes deployment.

**Request body:**

```json
{
    "name": "nginx-deployment",
    "namespace": "default",
    "image": "nginx:latest",
    "replicas": 3,
    "ports": [80, 443]
}
```

**Response:** `201 Created`

```json
{
    "id": "k8s-dep-001",
    "name": "nginx-deployment",
    "namespace": "default",
    "status": "CREATING"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/k8s/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"name":"nginx-deployment","namespace":"default","image":"nginx:latest","replicas":3,"ports":[80,443]}'
```

---

#### [NEW] `GET /api/v1/k8s/deployments`

List all Kubernetes deployments.

**Response:** `200 OK`

```json
[
    {
        "id": "k8s-dep-001",
        "name": "nginx-deployment",
        "namespace": "default",
        "replicas": 3,
        "readyReplicas": 3,
        "status": "RUNNING"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/k8s/deployments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/k8s/deployments/{id}`

Get a Kubernetes deployment by ID.

**Response:** `200 OK`

**Example:**

```bash
curl http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `DELETE /api/v1/k8s/deployments/{id}`

Delete a Kubernetes deployment.

**Response:** `204 No Content`

**Example:**

```bash
curl -X DELETE http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `POST /api/v1/k8s/deployments/{id}/scale`

Scale a Kubernetes deployment.

**Request body:**

```json
{
    "replicas": 5
}
```

**Response:** `200 OK`

```json
{
    "id": "k8s-dep-001",
    "replicas": 5,
    "status": "SCALING"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/scale \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{"replicas":5}'
```

---

#### [NEW] `POST /api/v1/k8s/deployments/{id}/restart`

Restart pods in a Kubernetes deployment.

**Response:** `200 OK`

```json
{
    "id": "k8s-dep-001",
    "status": "RESTARTING",
    "message": "Rolling restart initiated"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/restart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/k8s/deployments/{id}/status`

Get the status of a Kubernetes deployment.

**Response:** `200 OK`

```json
{
    "id": "k8s-dep-001",
    "name": "nginx-deployment",
    "namespace": "default",
    "replicas": 3,
    "readyReplicas": 3,
    "updatedReplicas": 3,
    "status": "RUNNING"
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/k8s/deployments/{id}/pods`

List pods belonging to a Kubernetes deployment.

**Response:** `200 OK`

```json
[
    {
        "name": "nginx-deployment-7d4b8c9f6-x2k9p",
        "status": "Running",
        "ready": "1/1",
        "restarts": 0,
        "age": "2d 5h"
    },
    {
        "name": "nginx-deployment-7d4b8c9f6-m8n3q",
        "status": "Running",
        "ready": "1/1",
        "restarts": 0,
        "age": "2d 5h"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/pods \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/k8s/deployments/{id}/logs`

Get logs from pods in a Kubernetes deployment.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tail` | integer | 100 | Number of log lines to return |
| `container` | string | (first) | Container name (for multi-container pods) |
| `since` | string | (all) | Only return logs since this duration (e.g. `1h`, `30m`) |

**Response:** `200 OK`

```json
{
    "deploymentId": "k8s-dep-001",
    "logs": "2025-01-15T10:30:00Z [INFO] nginx started on port 80\n2025-01-15T10:30:01Z [INFO] Ready to accept connections\n"
}
```

**Example:**

```bash
curl "http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/logs?tail=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

#### [NEW] `GET /api/v1/k8s/deployments/{id}/events`

Get events for a Kubernetes deployment.

**Response:** `200 OK`

```json
[
    {
        "type": "Normal",
        "reason": "ScalingReplicaSet",
        "message": "Scaled up replica set nginx-deployment-7d4b8c9f6 to 3",
        "timestamp": "2025-01-15T10:30:00Z"
    },
    {
        "type": "Normal",
        "reason": "Started",
        "message": "Started container nginx",
        "timestamp": "2025-01-15T10:30:05Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/k8s/deployments/k8s-dep-001/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

### WebSocket

#### `WS /ws/ssh/{vmId}`

Real-time SSH terminal session to a virtual machine.

**Protocol:** WebSocket (ws:// or wss://)

**Connection URL:**

```
ws://localhost:6060/ws/ssh/vm-001
```

**Messages (JSON):**

Client -> Server:

```json
{
    "type": "input",
    "data": "ls -la\n"
}
```

Server -> Client:

```json
{
    "type": "output",
    "data": "total 32\ndrwxr-xr-x 5 root root 4096 Jan 15 10:30 .\n"
}
```

**Example (using websocat):**

```bash
websocat ws://localhost:6060/ws/ssh/vm-001
```

---

### Test

#### `GET /api/v1/test`

Health check / smoke test endpoint.

**Response:** `200 OK`

```json
{
    "status": "ok",
    "service": "deployment-service",
    "timestamp": "2025-01-15T12:00:00Z"
}
```

**Example:**

```bash
curl http://localhost:6060/api/v1/test
```

---

#### `POST /api/v1/test`

Echo / validation test endpoint.

**Request body:**

```json
{
    "message": "hello"
}
```

**Response:** `200 OK`

```json
{
    "echo": "hello",
    "timestamp": "2025-01-15T12:00:00Z"
}
```

**Example:**

```bash
curl -X POST http://localhost:6060/api/v1/test \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

---

## Cloud Pricer Service

Base URL (direct): `http://localhost:8085`
Base URL (gateway): `http://localhost:6060`

Cost tracking, quota management, and threshold alerting microservice.

---

### Cost Records

#### `GET /api/v1/costs`

List all cost records with breakdowns.

**Response:** `200 OK`

```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "tenantId": "11111111-1111-1111-1111-111111111111",
        "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
        "periodStart": "2026-07-01T00:00:00Z",
        "periodEnd": "2026-07-31T23:59:59Z",
        "mode": "VM",
        "computeCost": 150.5,
        "storageCost": 45.0,
        "networkCost": 12.3,
        "backupCost": 8.2,
        "osCost": 25.0,
        "totalCost": 241.0,
        "breakdowns": [
            {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "costRecordId": "550e8400-e29b-41d4-a716-446655440000",
                "type": "COMPUTE",
                "unitCost": 0.05,
                "quantity": 3010.0,
                "total": 150.5,
                "createdAt": "2026-07-13T15:41:43.130Z"
            }
        ],
        "createdAt": "2026-07-13T15:41:43.130Z",
        "updatedAt": "2026-07-13T15:41:43.130Z"
    }
]
```

**Example:**

```bash
curl http://localhost:6060/api/v1/costs
```

---

#### `GET /api/v1/costs/{id}`

Get a single cost record by ID with its breakdowns.

**Response:** `200 OK` — Same shape as above (single object).

**Example:**

```bash
curl http://localhost:6060/api/v1/costs/550e8400-e29b-41d4-a716-446655440000
```

---

#### `POST /api/v1/costs`

Create a new cost record with optional breakdown lines.
`totalCost` is auto-computed: `computeCost + storageCost + networkCost + backupCost + osCost`.
Each breakdown `total` is auto-computed: `unitCost * quantity`.

**Request body:**

```json
{
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
    "periodStart": "2026-07-01T00:00:00Z",
    "periodEnd": "2026-07-31T23:59:59Z",
    "mode": "VM",
    "computeCost": 150.5,
    "storageCost": 45.0,
    "networkCost": 12.3,
    "backupCost": 8.2,
    "osCost": 25.0,
    "breakdowns": [
        { "type": "COMPUTE", "unitCost": 0.05, "quantity": 3010 },
        { "type": "STORAGE", "unitCost": 0.10, "quantity": 450 },
        { "type": "NETWORK", "unitCost": 0.01, "quantity": 1230 }
    ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tenantId` | UUID | yes | |
| `serviceEnvironmentId` | UUID | yes | |
| `periodStart` | ISO-8601 | yes | |
| `periodEnd` | ISO-8601 | yes | |
| `mode` | string | yes | `VM` or `SERVICE` |
| `computeCost` | number | no | Default 0 |
| `storageCost` | number | no | Default 0 |
| `networkCost` | number | no | Default 0 |
| `backupCost` | number | no | Default 0 |
| `osCost` | number | no | Default 0 |
| `breakdowns` | array | no | Each: `{ type, unitCost, quantity }` |

Breakdown types: `COMPUTE`, `STORAGE`, `NETWORK`, `BACKUP`, `OS`.

**Response:** `201 CREATED`

---

#### `DELETE /api/v1/costs/{id}`

Delete a cost record and all its breakdowns.

**Response:** `204 NO CONTENT`

---

### Cost Forecasts

#### `GET /api/v1/costs/forecast`

Generate a simple cost forecast using moving-average extrapolation from the last 3 records.

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `tenantId` | UUID | yes |
| `serviceEnvironmentId` | UUID | yes |
| `period` | string | yes | e.g. `2026-08` |

**Response:** `200 OK`

```json
{
    "id": "forecast-uuid",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
    "period": "2026-08",
    "predictedCost": 241.0,
    "confidenceLevel": 0.3,
    "createdAt": "2026-07-13T15:52:51Z"
}
```

| Confidence | Meaning |
|------------|---------|
| 0.0 | No data |
| 0.3 | 1 historical record |
| 0.5 | 2 records |
| 0.7 | 3 records |
| 0.9 | 3+ records (capped) |

**Example:**

```bash
curl "http://localhost:6060/api/v1/costs/forecast?tenantId=11111111-1111-1111-1111-111111111111&serviceEnvironmentId=66666666-6666-6666-6666-666666666666&period=2026-08"
```

---

#### `GET /api/v1/costs/forecast/list`

List all forecasts for a tenant.

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `tenantId` | UUID | yes |

**Response:** `200 OK` — Array of forecast objects.

---

### Cost Aggregation

#### `GET /api/v1/costs/aggregate/tenant`

Aggregate total costs grouped by tenant.

**Response:** `200 OK`

```json
[
    {
        "groupKey": "tenant-uuid",
        "totalCost": 4500.00,
        "computeCost": 2000.00,
        "storageCost": 1200.00,
        "networkCost": 800.00,
        "backupCost": 300.00,
        "osCost": 200.00,
        "recordCount": 12
    }
]
```

---

#### `GET /api/v1/costs/aggregate/service-environment`

Aggregate total costs grouped by service environment.

**Response:** `200 OK` — Array of aggregate objects with `groupKey` = serviceEnvironmentId.

---

#### `GET /api/v1/costs/aggregate/period`

Aggregate total costs grouped by period (YYYY-MM).

**Response:** `200 OK` — Array of aggregate objects with `groupKey` = `"2026-07"`.

---

#### `GET /api/v1/costs/aggregate/period/{tenantId}`

Aggregate costs by period for a specific tenant.

**Response:** `200 OK` — Array of aggregate objects.

---

#### `GET /api/v1/costs/aggregate/service-environment/{tenantId}`

Aggregate costs by service environment for a specific tenant.

**Response:** `200 OK` — Array of aggregate objects.

---

### Quotas

#### `GET /api/v1/quotas`

List all quotas.

**Response:** `200 OK`

```json
[
    {
        "id": "quota-uuid",
        "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
        "maxCpu": 16.0,
        "maxRam": 32768.0,
        "maxStorage": 1000.0,
        "maxPods": 50,
        "maxBudget": 1000.0,
        "period": "monthly",
        "isActive": true,
        "createdAt": "2026-07-13T15:41:43Z",
        "updatedAt": "2026-07-13T15:41:43Z"
    }
]
```

---

#### `GET /api/v1/quotas/{id}`

Get a single quota by ID.

**Response:** `200 OK`

---

#### `POST /api/v1/quotas`

Create a new quota for a service environment.

**Request body:**

```json
{
    "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
    "maxCpu": 16.0,
    "maxRam": 32768,
    "maxStorage": 1000,
    "maxPods": 50,
    "maxBudget": 1000.0,
    "period": "monthly",
    "isActive": true
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `serviceEnvironmentId` | UUID | yes | |
| `maxCpu` | number | no | CPU cores |
| `maxRam` | number | no | RAM in MB |
| `maxStorage` | number | no | Storage in GB |
| `maxPods` | integer | no | Kubernetes pods |
| `maxBudget` | number | no | Financial budget |
| `period` | string | yes | `daily`, `weekly`, or `monthly` |
| `isActive` | boolean | no | Default `true` |

**Response:** `201 CREATED`

---

#### `PATCH /api/v1/quotas/{id}`

Update a quota (partial update — all fields optional).

**Request body:** Same shape as POST.

**Response:** `200 OK`

---

#### `DELETE /api/v1/quotas/{id}`

Delete a quota.

**Response:** `204 NO CONTENT`

---

### Alerts

#### `GET /api/v1/alerts`

List all alerts.

**Response:** `200 OK`

```json
[
    {
        "id": "alert-uuid",
        "tenantId": "11111111-1111-1111-1111-111111111111",
        "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
        "type": "CPU",
        "metric": "cpu_usage",
        "threshold": 80.0,
        "actualValue": 92.5,
        "severity": "CRITICAL",
        "status": "OPEN",
        "message": "CPU usage at 92.5%",
        "createdAt": "2026-07-13T15:52:51Z",
        "acknowledgedBy": null,
        "resolvedAt": null
    }
]
```

---

#### `GET /api/v1/alerts/status/{status}`

Filter alerts by status. Values: `OPEN`, `ACK`, `RESOLVED`.

**Response:** `200 OK` — Array of alerts.

---

#### `GET /api/v1/alerts/severity/{severity}`

Filter alerts by severity. Values: `INFO`, `WARN`, `CRITICAL`.

**Response:** `200 OK` — Array of alerts.

---

#### `POST /api/v1/alerts`

Create a new alert (typically triggered by threshold detection).

**Request body:**

```json
{
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "serviceEnvironmentId": "66666666-6666-6666-6666-666666666666",
    "type": "CPU",
    "metric": "cpu_usage",
    "threshold": 80.0,
    "actualValue": 92.5,
    "severity": "CRITICAL",
    "message": "CPU usage at 92.5%"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tenantId` | UUID | yes | |
| `serviceEnvironmentId` | UUID | yes | |
| `type` | string | yes | `CPU`, `RAM`, `STORAGE`, `BUDGET`, `NETWORK` |
| `metric` | string | yes | Metric name that triggered |
| `threshold` | number | yes | Threshold value |
| `actualValue` | number | yes | Measured value |
| `severity` | string | yes | `INFO`, `WARN`, `CRITICAL` |
| `message` | string | no | Human-readable description |

New alerts default to status `OPEN`.

**Response:** `201 CREATED`

---

#### `PATCH /api/v1/alerts/{id}/acknowledge`

Acknowledge an alert (sets status to `ACK`).

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `acknowledgedBy` | string | yes | User who acknowledged |

**Response:** `200 OK`

---

#### `PATCH /api/v1/alerts/{id}/resolve`

Resolve an alert (sets status to `RESOLVED`, records `resolvedAt` timestamp).

**Response:** `200 OK`

---

#### `DELETE /api/v1/alerts/{id}`

Delete an alert.

**Response:** `204 NO CONTENT`

---

### Automatic Alert Generation (Cron Job)

The `AlertGeneratorService` runs a scheduled task every 60 seconds (configurable via `alert.check.interval` in ms) that:

1. Fetches all **active quotas** from the database
2. For each quota, calls `GET http://localhost:8081/api/v1/metrics/latest/{serviceEnvironmentId}` to get the latest metrics
3. Compares metrics against quota thresholds:

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| CPU usage | 80% of `maxCpu` | 90% of `maxCpu` |
| RAM usage | 80% of `maxRam` | 90% of `maxRam` |
| Disk usage | 85% of `maxStorage` | 95% of `maxStorage` |
| Pod count | 80% of `maxPods` | 90% of `maxPods` |

4. **Deduplication**: Skips creating alerts if an `OPEN` or `ACK` alert already exists for the same service-environment + metric + severity combination
5. Auto-created alerts have `type=QUOTA` and status `OPEN`

**Configuration** (`application.properties`):

```properties
alert.check.interval=60000   # check every 60 seconds (default)
```

**Severity levels:**
- `WARNING` — metric approaching threshold (80-89%)
- `CRITICAL` — metric exceeds threshold (90%+)

---

## Notifications (Deployment Service, port 8081)

Real-time notifications with SSE streaming. Gateway route: `/api/v1/notifications/**`

### Notification Endpoints

#### `POST /api/v1/notifications`

Create a notification and push to all connected SSE clients.

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `userId` | UUID | yes |
| `title` | string | yes |
| `message` | string | yes |
| `type` | string | yes | `DEPLOYMENT`, `ALERT`, `SYSTEM`, `QUOTA`, `BACKUP`, `VM`, `K8S` |
| `tenantId` | UUID | yes |
| `link` | string | no | Route to navigate to on click |

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Deployment Successful",
  "message": "Service auth-service v2.1 deployed to production",
  "type": "DEPLOYMENT",
  "read": false,
  "tenantId": "550e8400-e29b-41d4-a716-446655440002",
  "link": "/admin/devops/deployments",
  "createdAt": "2026-07-13T10:30:00Z",
  "updatedAt": "2026-07-13T10:30:00Z"
}
```

---

#### `GET /api/v1/notifications`

List all notifications for a user (newest first).

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | UUID | yes |

**Response:** `200 OK` — Array of notification objects

---

#### `GET /api/v1/notifications/unread`

List unread notifications for a user.

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | UUID | yes |

**Response:** `200 OK` — Array of unread notification objects

---

#### `GET /api/v1/notifications/unread/count`

Count unread notifications for a user.

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | UUID | yes |

**Response:** `200 OK`

```json
{ "count": 5 }
```

---

#### `PATCH /api/v1/notifications/{id}/read`

Mark a single notification as read.

**Response:** `200 OK` — Updated notification object

---

#### `PATCH /api/v1/notifications/read-all`

Mark all notifications for a user as read.

**Query parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | UUID | yes |

**Response:** `200 OK`

---

#### `DELETE /api/v1/notifications/{id}`

Delete a notification.

**Response:** `204 NO CONTENT`

---

#### `DELETE /api/v1/notifications/user/{userId}`

Delete all notifications for a user.

**Response:** `204 NO CONTENT`

---

#### `GET /api/v1/notifications/stream` (SSE)

Subscribe to real-time notifications via Server-Sent Events.

**Response:** `text/event-stream`

Events are pushed with name `notification`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Alert Triggered",
  "message": "CPU usage exceeded 90% on auth-service",
  "type": "ALERT",
  "read": false,
  "link": "/admin/devops/alerts",
  "timestamp": "2026-07-13T10:30:00Z"
}
```

---

### Notification Types

| Type | Description |
|------|-------------|
| `DEPLOYMENT` | Deployment events (start, success, failure) |
| `ALERT` | Cost/metric threshold alerts |
| `SYSTEM` | System-wide announcements |
| `QUOTA` | Quota threshold warnings |
| `BACKUP` | Backup completion/failure |
| `VM` | Virtual machine lifecycle events |
| `K8S` | Kubernetes deployment events |
