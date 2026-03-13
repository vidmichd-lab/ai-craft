#!/bin/bash

set -euo pipefail

SOURCE_BUCKET="${SOURCE_BUCKET:-ai-craft}"
TARGET_BUCKET="${TARGET_BUCKET:-ai-craft-media}"
ENDPOINT_URL="${ENDPOINT_URL:-https://storage.yandexcloud.net}"
PUBLISHED_PREFIX="${PUBLISHED_PREFIX:-published}"
MANIFEST_URL="${MANIFEST_URL:-https://d5dcfknc559sg4v868te.laqt4bj7.apigw.yandexcloud.net/media/manifest}"
RUN_CLEANUP=false

for arg in "$@"; do
  case "$arg" in
    --cleanup-source)
      RUN_CLEANUP=true
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--cleanup-source]" >&2
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

sync_prefix() {
  local source_prefix="$1"
  local target_prefix="$2"
  echo "Sync ${SOURCE_BUCKET}/${source_prefix} -> ${TARGET_BUCKET}/${target_prefix}"
  aws --endpoint-url="${ENDPOINT_URL}" s3 sync \
    "s3://${SOURCE_BUCKET}/${source_prefix}" \
    "s3://${TARGET_BUCKET}/${target_prefix}"
}

count_remote_prefix() {
  local bucket="$1"
  local prefix="$2"
  aws --endpoint-url="${ENDPOINT_URL}" s3 ls "s3://${bucket}/${prefix}" --recursive | awk 'END { print NR + 0 }'
}

count_manifest_entries() {
  curl -fsS "${MANIFEST_URL}" | python3 -c '
import json
import sys

payload = json.load(sys.stdin)
assets = payload.get("assets", {})
count = 0
for level1 in assets.values():
    if not isinstance(level1, dict):
        continue
    for items in level1.values():
        if isinstance(items, list):
            count += len(items)
print(count)
'
}

verify_keys() {
  local local_command="$1"
  local remote_command="$2"
  local label="$3"

  local local_tmp remote_tmp
  local_tmp="$(mktemp)"
  remote_tmp="$(mktemp)"

  eval "$local_command" | LC_ALL=C sort > "$local_tmp"
  eval "$remote_command" | LC_ALL=C sort > "$remote_tmp"

  if diff -u "$local_tmp" "$remote_tmp" >/dev/null; then
    echo "Verified ${label}"
  else
    echo "Verification failed for ${label}" >&2
    diff -u "$local_tmp" "$remote_tmp" || true
    rm -f "$local_tmp" "$remote_tmp"
    exit 1
  fi

  rm -f "$local_tmp" "$remote_tmp"
}

cleanup_prefix() {
  local prefix="$1"
  echo "Cleanup source prefix s3://${SOURCE_BUCKET}/${prefix}"
  aws --endpoint-url="${ENDPOINT_URL}" s3 rm "s3://${SOURCE_BUCKET}/${prefix}" --recursive
}

echo "Migrating media from ${SOURCE_BUCKET} to ${TARGET_BUCKET}"

sync_prefix "assets/3d" "${PUBLISHED_PREFIX}/3d"
sync_prefix "assets/pro" "${PUBLISHED_PREFIX}/pro"
sync_prefix "logo" "${PUBLISHED_PREFIX}/logo"
sync_prefix "font" "${PUBLISHED_PREFIX}/font"

echo "Verifying migrated keys"
verify_keys \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${SOURCE_BUCKET}/assets/3d/' --recursive | awk '{print \$4}' | sed 's#^assets/3d/##'" \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${TARGET_BUCKET}/${PUBLISHED_PREFIX}/3d/' --recursive | awk '{print \$4}' | sed 's#^${PUBLISHED_PREFIX}/3d/##'" \
  "assets/3d"

verify_keys \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${SOURCE_BUCKET}/assets/pro/' --recursive | awk '{print \$4}' | sed 's#^assets/pro/##'" \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${TARGET_BUCKET}/${PUBLISHED_PREFIX}/pro/' --recursive | awk '{print \$4}' | sed 's#^${PUBLISHED_PREFIX}/pro/##'" \
  "assets/pro"

verify_keys \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${SOURCE_BUCKET}/logo/' --recursive | awk '{print \$4}' | sed 's#^logo/##'" \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${TARGET_BUCKET}/${PUBLISHED_PREFIX}/logo/' --recursive | awk '{print \$4}' | sed 's#^${PUBLISHED_PREFIX}/logo/##'" \
  "logo"

verify_keys \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${SOURCE_BUCKET}/font/' --recursive | awk '{print \$4}' | sed 's#^font/##'" \
  "aws --endpoint-url='${ENDPOINT_URL}' s3 ls 's3://${TARGET_BUCKET}/${PUBLISHED_PREFIX}/font/' --recursive | awk '{print \$4}' | sed 's#^${PUBLISHED_PREFIX}/font/##'" \
  "font"

echo "Object counts"
echo "  source assets/3d: $(count_remote_prefix "${SOURCE_BUCKET}" "assets/3d/")"
echo "  source assets/pro: $(count_remote_prefix "${SOURCE_BUCKET}" "assets/pro/")"
echo "  source logo: $(count_remote_prefix "${SOURCE_BUCKET}" "logo/")"
echo "  source font: $(count_remote_prefix "${SOURCE_BUCKET}" "font/")"
echo "  target published/3d: $(count_remote_prefix "${TARGET_BUCKET}" "${PUBLISHED_PREFIX}/3d/")"
echo "  target published/pro: $(count_remote_prefix "${TARGET_BUCKET}" "${PUBLISHED_PREFIX}/pro/")"
echo "  target published/logo: $(count_remote_prefix "${TARGET_BUCKET}" "${PUBLISHED_PREFIX}/logo/")"
echo "  target published/font: $(count_remote_prefix "${TARGET_BUCKET}" "${PUBLISHED_PREFIX}/font/")"

echo "Manifest entries: $(count_manifest_entries)"

if [ "${RUN_CLEANUP}" = "true" ]; then
  echo "Cleanup requested, removing migrated media from source bucket"
  cleanup_prefix "assets/3d/"
  cleanup_prefix "assets/pro/"
  cleanup_prefix "logo/"
  cleanup_prefix "font/"
  echo "Source cleanup completed"
else
  echo "Source cleanup skipped"
fi
