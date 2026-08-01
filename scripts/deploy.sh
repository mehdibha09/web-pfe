#!/usr/bin/env bash
set -euo pipefail

REGISTRY="192.168.56.30"
NEXUS_USER="${NEXUS_USER:-admin}"
NEXUS_PASSWORD="${NEXUS_PASSWORD:-admin}"
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"
K8S_INFRA_DIR="${K8S_INFRA_DIR:-/home/mehdi/Desktop/Insfrastructure-PFE/k8s/vagrant/master}"

SERVICES=(
	"authService:auth-service"
	"cloudPricer:cloud-pricer"
	"gateway:gateway"
	"deployment:deployment-service"
	"frontend:frontend"
)

build_and_push() {
	local folder="$1" image="$2"
	echo "==> Build + push ${image}:${TAG}"
	docker build \
		-t "${REGISTRY}/${image}:${TAG}" \
		-t "${REGISTRY}/${image}:latest" \
		"${folder}"
	docker push "${REGISTRY}/${image}:${TAG}"
	docker push "${REGISTRY}/${image}:latest"
}

deploy() {
	local image="$1" deployment="$2" container="$3"
	echo "==> Deploy ${deployment} -> ${image}:${TAG}"
	(
		cd "${K8S_INFRA_DIR}"
		vagrant ssh -c "set -e; kubectl -n app-pfe set image deployment/${deployment} ${container}=${REGISTRY}/${image}:${TAG} && kubectl -n app-pfe rollout status deployment/${deployment} --timeout=300s"
	)
}

echo ">>> Registry login: ${REGISTRY}"
echo "${NEXUS_PASSWORD}" | docker login "${REGISTRY}" -u "${NEXUS_USER}" --password-stdin

for svc in "${SERVICES[@]}"; do
	folder="${svc%%:*}"
	image="${svc##*:}"
	build_and_push "${folder}" "${image}"
done

echo ">>> Applying K8s manifests"
MANIFESTS=$(ls /home/mehdi/Desktop/app-pfe/k8s/*.yaml 2>/dev/null || echo "")
for mf in ${MANIFESTS}; do
	case "$(basename ${mf})" in
		postgres.yaml)
			echo "==> skip postgres.yaml (external DB via EndpointSlice)"
			continue
			;;
	esac
	echo "==> kubectl apply -f $(basename ${mf})"
	(
		cd "${K8S_INFRA_DIR}"
		vagrant ssh -c "kubectl apply -f -" < "${mf}"
	)
done

deploy "auth-service"       "auth-service"       "auth-service"
deploy "cloud-pricer"       "cloud-pricer-service" "cloud-pricer-service"
deploy "gateway"            "gateway"            "gateway"
deploy "deployment-service" "deployment-service" "deployment-service"
deploy "frontend"           "frontend"           "frontend"

echo ">>> Deployment done. TAG=${TAG}"
