# Kubernetes deployment

## Images

- Backend: `app-pfe-authservice:latest`
- Frontend: `app-pfe-frontend:latest`

## Folder structure

- [shared](shared)
  - namespace
  - ingress
- [backend](backend)
  - PostgreSQL secret/service/statefulset
  - backend configmap/deployment/service
- [frontend](frontend)
  - frontend deployment/service

## Environment

- Backend uses PostgreSQL inside the cluster by default (`postgres` service).
- Frontend serves on port `7070` inside Kubernetes and calls the API via `/api/v1` so it works behind the ingress.

## Notes

- If you want to use an external PostgreSQL server instead of the in-cluster one, change `DB_HOST` in [backend/configmap.yaml](backend/configmap.yaml).
- The ingress host is set to `192.168.56.40`.
- Frontend service port is `7070`.

## Apply order

1. shared/namespace
2. backend/postgres secret + service + statefulset
3. backend/configmap + deployment + service
4. frontend/deployment + service
5. shared/ingress
