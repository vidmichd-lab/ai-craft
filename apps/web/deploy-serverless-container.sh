#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CONTAINER_NAME="${CONTAINER_NAME:-ai-craft-web}"
REGISTRY_NAME="${REGISTRY_NAME:-ai-craft}"
REGISTRY_ID="${REGISTRY_ID:-}"
IMAGE_NAME="${IMAGE_NAME:-web}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD)}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-}"
WORKSPACE_API_BASE_URL="${WORKSPACE_API_BASE_URL:-https://d5dvnbnk8h8lkshgdjjm.l3hh3szr.apigw.yandexcloud.net}"
MEDIA_MANIFEST_URL="${MEDIA_MANIFEST_URL:-https://d5dcfknc559sg4v868te.laqt4bj7.apigw.yandexcloud.net/media/manifest}"
MEDIA_MUTATION_TOKEN="${MEDIA_MUTATION_TOKEN:-}"
NODE_ENV="${NODE_ENV:-production}"
MEMORY="${MEMORY:-512MB}"
CORES="${CORES:-1}"
CORE_FRACTION="${CORE_FRACTION:-100}"
CONCURRENCY="${CONCURRENCY:-8}"
EXECUTION_TIMEOUT="${EXECUTION_TIMEOUT:-30s}"
OCI_CLI="${OCI_CLI:-}"
REGISTRY_LOGIN_MODE="${REGISTRY_LOGIN_MODE:-auto}"

if [ -z "${YC_FOLDER_ID:-}" ]; then
  YC_FOLDER_ID="$(yc config get folder-id 2>/dev/null || true)"
fi

if [ -z "${YC_FOLDER_ID:-}" ]; then
  echo "YC_FOLDER_ID is required" >&2
  exit 1
fi

if [ -z "$SERVICE_ACCOUNT_ID" ]; then
  echo "SERVICE_ACCOUNT_ID is required" >&2
  exit 1
fi

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI is required" >&2
  exit 1
fi

if [ -z "$OCI_CLI" ]; then
  if command -v docker >/dev/null 2>&1; then
    OCI_CLI="docker"
  elif command -v podman >/dev/null 2>&1; then
    OCI_CLI="podman"
  fi
fi

if [ -z "$OCI_CLI" ]; then
  echo "docker or podman is required to build and push the image" >&2
  exit 1
fi

cd "$ROOT_DIR"

if [ -z "$REGISTRY_ID" ]; then
  if yc container registry get "$REGISTRY_NAME" >/dev/null 2>&1; then
    REGISTRY_ID="$(yc container registry get "$REGISTRY_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
  else
    REGISTRY_ID="$(yc container registry create "$REGISTRY_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
  fi
fi

IMAGE_REF="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Using registry: ${REGISTRY_ID}"
echo "Building image: ${IMAGE_REF}"
echo "Using OCI CLI: ${OCI_CLI}"

registry_login() {
  if [ "$REGISTRY_LOGIN_MODE" = "oauth" ]; then
    yc config get token
    return
  fi

  if [ "$REGISTRY_LOGIN_MODE" = "iam" ]; then
    yc iam create-token
    return
  fi

  local oauth_token=""
  oauth_token="$(yc config get token 2>/dev/null || true)"
  if [ -n "$oauth_token" ]; then
    printf '%s' "$oauth_token"
    return
  fi

  yc iam create-token
}

registry_login | "$OCI_CLI" login --username oauth --password-stdin cr.yandex

"$OCI_CLI" build \
  --platform linux/amd64 \
  -f "${SCRIPT_DIR}/Dockerfile" \
  -t "${IMAGE_REF}" \
  "${ROOT_DIR}"

"$OCI_CLI" push "${IMAGE_REF}"

if ! yc serverless container get "$CONTAINER_NAME" >/dev/null 2>&1; then
  yc serverless container create "$CONTAINER_NAME"
fi

yc serverless container revision deploy \
  --container-name "$CONTAINER_NAME" \
  --image "${IMAGE_REF}" \
  --service-account-id "$SERVICE_ACCOUNT_ID" \
  --memory "$MEMORY" \
  --cores "$CORES" \
  --core-fraction "$CORE_FRACTION" \
  --concurrency "$CONCURRENCY" \
  --execution-timeout "$EXECUTION_TIMEOUT" \
  --environment NODE_ENV="$NODE_ENV",WORKSPACE_API_BASE_URL="$WORKSPACE_API_BASE_URL",MEDIA_MANIFEST_URL="$MEDIA_MANIFEST_URL"${MEDIA_MUTATION_TOKEN:+,MEDIA_MUTATION_TOKEN="$MEDIA_MUTATION_TOKEN"}

yc serverless container allow-unauthenticated-invoke "$CONTAINER_NAME" >/dev/null

echo
echo "Serverless container deployed."
yc serverless container get "$CONTAINER_NAME"
