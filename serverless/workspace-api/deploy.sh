#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

FUNCTION_NAME="${FUNCTION_NAME:-ai-craft-workspace-api}"
FUNCTION_TAG="${FUNCTION_TAG:-latest}"
GATEWAY_NAME="${GATEWAY_NAME:-ai-craft-workspace-gateway}"
ENTRYPOINT="${ENTRYPOINT:-index.handler}"
RUNTIME="${RUNTIME:-nodejs22}"
MEMORY="${MEMORY:-256m}"
TIMEOUT="${TIMEOUT:-10s}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-}"
GATEWAY_SERVICE_ACCOUNT_ID="${GATEWAY_SERVICE_ACCOUNT_ID:-$SERVICE_ACCOUNT_ID}"
PACKAGE_BUCKET_NAME="${PACKAGE_BUCKET_NAME:-}"
PACKAGE_OBJECT_PREFIX="${PACKAGE_OBJECT_PREFIX:-workspace-api}"

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI is required" >&2
  exit 1
fi

if [ ! -f package.json ]; then
  echo "workspace-api package.json not found" >&2
  exit 1
fi

if [ -z "${YC_FOLDER_ID:-}" ]; then
  echo "YC_FOLDER_ID is required" >&2
  exit 1
fi

echo "Installing workspace-api dependencies..."
npm install

if ! yc serverless function get "$FUNCTION_NAME" >/dev/null 2>&1; then
  yc serverless function create "$FUNCTION_NAME"
fi

FUNCTION_ID="$(yc serverless function get "$FUNCTION_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

BUILD_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

cp index.js index.mjs package.json "$BUILD_DIR/"
if [ -f package-lock.json ]; then
  cp package-lock.json "$BUILD_DIR/"
fi

echo "Preparing runtime package..."
(
  cd "$BUILD_DIR"
  npm install --omit=dev --ignore-scripts
  rm -f package.json package-lock.json
  zip -qr function.zip .
)

CREATE_ARGS=(
  yc serverless function version create
  --function-id "$FUNCTION_ID"
  --runtime "$RUNTIME"
  --entrypoint "$ENTRYPOINT"
  --memory "$MEMORY"
  --execution-timeout "$TIMEOUT"
  --tags "$FUNCTION_TAG"
  --environment YC_FOLDER_ID="${YC_FOLDER_ID}"
  --environment WORKSPACE_STORAGE="${WORKSPACE_STORAGE:-memory}"
  --environment WORKSPACE_JWT_SECRET="${WORKSPACE_JWT_SECRET:-change-me}"
  --environment WORKSPACE_ALLOWED_ORIGINS="${WORKSPACE_ALLOWED_ORIGINS:-https://ai-craft.website.yandexcloud.net,http://localhost:8000}"
  --environment WORKSPACE_SUPERADMIN_EMAILS="${WORKSPACE_SUPERADMIN_EMAILS:-vidmichd@ya.ru}"
  --environment WORKSPACE_COOKIE_SECURE="${WORKSPACE_COOKIE_SECURE:-true}"
  --environment WORKSPACE_COOKIE_SAME_SITE="${WORKSPACE_COOKIE_SAME_SITE:-none}"
  --environment WORKSPACE_DEBUG_EVENT="${WORKSPACE_DEBUG_EVENT:-false}"
  --environment WORKSPACE_ACCESS_TTL_SECONDS="${WORKSPACE_ACCESS_TTL_SECONDS:-43200}"
  --environment WORKSPACE_SESSION_TTL_SECONDS="${WORKSPACE_SESSION_TTL_SECONDS:-2592000}"
  --environment WORKSPACE_DEFAULT_ROLE="${WORKSPACE_DEFAULT_ROLE:-editor}"
  --environment WORKSPACE_BOOTSTRAP_TEAM_SLUG="${WORKSPACE_BOOTSTRAP_TEAM_SLUG:-demo}"
  --environment WORKSPACE_BOOTSTRAP_TEAM_NAME="${WORKSPACE_BOOTSTRAP_TEAM_NAME:-Demo Team}"
  --environment WORKSPACE_BOOTSTRAP_ADMIN_EMAIL="${WORKSPACE_BOOTSTRAP_ADMIN_EMAIL:-}"
  --environment WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD="${WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD:-}"
  --environment WORKSPACE_BOOTSTRAP_ADMIN_NAME="${WORKSPACE_BOOTSTRAP_ADMIN_NAME:-}"
  --environment WORKSPACE_BOOTSTRAP_DEFAULTS_JSON="${WORKSPACE_BOOTSTRAP_DEFAULTS_JSON:-{}}"
  --environment WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON="${WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON:-{}}"
)

if [ -n "$SERVICE_ACCOUNT_ID" ]; then
  CREATE_ARGS+=(--service-account-id "$SERVICE_ACCOUNT_ID")
fi

if [ -n "$PACKAGE_BUCKET_NAME" ]; then
  PACKAGE_OBJECT_NAME="${PACKAGE_OBJECT_PREFIX}/$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4).zip"
  PACKAGE_SHA256="$(shasum -a 256 "$BUILD_DIR/function.zip" | awk '{print $1}')"
  echo "Uploading function package to s3://${PACKAGE_BUCKET_NAME}/${PACKAGE_OBJECT_NAME}..."
  yc storage s3 cp "$BUILD_DIR/function.zip" "s3://${PACKAGE_BUCKET_NAME}/${PACKAGE_OBJECT_NAME}"
  CREATE_ARGS+=(
    --package-bucket-name "$PACKAGE_BUCKET_NAME"
    --package-object-name "$PACKAGE_OBJECT_NAME"
    --package-sha256 "$PACKAGE_SHA256"
  )
else
  CREATE_ARGS+=(--source-path "$BUILD_DIR/function.zip")
fi

if [ -n "${WORKSPACE_COOKIE_DOMAIN:-}" ]; then
  CREATE_ARGS+=(--environment WORKSPACE_COOKIE_DOMAIN="${WORKSPACE_COOKIE_DOMAIN}")
fi

if [ -n "${YDB_ENDPOINT:-}" ]; then
  CREATE_ARGS+=(--environment YDB_ENDPOINT="${YDB_ENDPOINT}")
fi

if [ -n "${YDB_DATABASE:-}" ]; then
  CREATE_ARGS+=(--environment YDB_DATABASE="${YDB_DATABASE}")
fi

"${CREATE_ARGS[@]}"

python3 - "$FUNCTION_ID" "$FUNCTION_TAG" "$GATEWAY_SERVICE_ACCOUNT_ID" <<'PY' > gateway.rendered.yaml
import pathlib
import sys

function_id = sys.argv[1]
function_tag = sys.argv[2]
gateway_service_account_id = sys.argv[3]
template = pathlib.Path("gateway.openapi.yaml").read_text(encoding="utf-8")
print(
    template
    .replace("${function_id}", function_id)
    .replace("${function_tag}", function_tag)
    .replace("${gateway_service_account_id}", gateway_service_account_id)
)
PY

if yc serverless api-gateway get "$GATEWAY_NAME" >/dev/null 2>&1; then
  yc serverless api-gateway update "$GATEWAY_NAME" --spec gateway.rendered.yaml
else
  yc serverless api-gateway create "$GATEWAY_NAME" --spec gateway.rendered.yaml
fi

echo "Workspace API deployed."
yc serverless api-gateway get "$GATEWAY_NAME"
