#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

FUNCTION_NAME="${FUNCTION_NAME:-ai-craft-media-api}"
FUNCTION_TAG="${FUNCTION_TAG:-latest}"
GATEWAY_NAME="${GATEWAY_NAME:-ai-craft-media-gateway}"
RUNTIME="${RUNTIME:-nodejs22}"
ENTRYPOINT="${ENTRYPOINT:-index.handler}"
NODE_ENV="${NODE_ENV:-production}"
MEMORY="${MEMORY:-256MB}"
EXECUTION_TIMEOUT="${EXECUTION_TIMEOUT:-10s}"

required_vars=(
  YC_FOLDER_ID
  MEDIA_BUCKET
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: $var_name" >&2
    exit 1
  fi
done

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

echo "Installing serverless dependencies..."
npm install

BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ai-craft-media-api.XXXXXX")"
cleanup() {
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "Bundling function source..."
npx esbuild "$SCRIPT_DIR/index.mjs" \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node22 \
  --outfile="$BUILD_DIR/index.js"

if ! yc serverless function get "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "Creating function: $FUNCTION_NAME"
  yc serverless function create "$FUNCTION_NAME"
fi

FUNCTION_ID="$(yc serverless function get "$FUNCTION_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
RENDERED_SPEC="$BUILD_DIR/gateway.openapi.yaml"
python3 - "$SCRIPT_DIR/gateway.openapi.yaml" "$RENDERED_SPEC" "$FUNCTION_ID" "$FUNCTION_TAG" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text()
rendered = (
    source
    .replace('${function_id}', sys.argv[3])
    .replace('${function_tag}', sys.argv[4])
)
Path(sys.argv[2]).write_text(rendered)
PY

echo "Deploying function version..."
CREATE_ARGS=(
  yc serverless function version create
  --function-id "$FUNCTION_ID"
  --runtime "$RUNTIME"
  --entrypoint "$ENTRYPOINT"
  --memory "$MEMORY"
  --execution-timeout "$EXECUTION_TIMEOUT"
  --source-path "$BUILD_DIR"
  --environment "NODE_ENV=$NODE_ENV"
  --environment "MEDIA_BUCKET=$MEDIA_BUCKET"
  --environment "MEDIA_PUBLIC_PREFIX=${MEDIA_PUBLIC_PREFIX:-published/}"
  --environment "MEDIA_DRAFT_PREFIX=${MEDIA_DRAFT_PREFIX:-drafts/}"
  --environment "MEDIA_URL_TTL_SECONDS=${MEDIA_URL_TTL_SECONDS:-900}"
  --environment "MEDIA_SIGNED_GETS=${MEDIA_SIGNED_GETS:-true}"
  --environment "MEDIA_PUBLIC_BASE_URL=${MEDIA_PUBLIC_BASE_URL:-}"
  --environment "MEDIA_ALLOWED_ORIGINS=${MEDIA_ALLOWED_ORIGINS:-https://aicrafter.ru,https://www.aicrafter.ru,https://ai-craft.website.yandexcloud.net,https://bbatcmo4t42t8vmcrqka.containers.yandexcloud.net,http://localhost:8000,http://localhost:8001}"
  --environment "MEDIA_ALLOWED_MIME_TYPES=${MEDIA_ALLOWED_MIME_TYPES:-image/webp,image/png,image/jpeg,image/svg+xml,font/woff2}"
  --environment "MEDIA_MAX_FILE_SIZE_BYTES=${MEDIA_MAX_FILE_SIZE_BYTES:-10485760}"
  --environment "S3_ENDPOINT=${S3_ENDPOINT:-https://storage.yandexcloud.net}"
  --environment "AWS_REGION=${AWS_REGION:-ru-central1}"
  --environment "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
  --environment "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
  --tags "$FUNCTION_TAG"
)

if [ -n "${MEDIA_MUTATION_TOKEN:-}" ]; then
  CREATE_ARGS+=(--environment "MEDIA_MUTATION_TOKEN=$MEDIA_MUTATION_TOKEN")
fi

"${CREATE_ARGS[@]}"

echo "Deploying API Gateway..."
if yc serverless api-gateway get "$GATEWAY_NAME" >/dev/null 2>&1; then
  yc serverless api-gateway update "$GATEWAY_NAME" \
    --spec "$RENDERED_SPEC"
else
  yc serverless api-gateway create "$GATEWAY_NAME" \
    --spec "$RENDERED_SPEC"
fi

echo
echo "Function ID: $FUNCTION_ID"
echo "Gateway info:"
yc serverless api-gateway get "$GATEWAY_NAME"
