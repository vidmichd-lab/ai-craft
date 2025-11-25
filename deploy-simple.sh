#!/bin/bash

# Упрощённый скрипт для быстрого деплоя
# Используйте этот скрипт, если бакет уже настроен

BUCKET_NAME="practicum-banners"
ENDPOINT_URL="https://storage.yandexcloud.net"

echo "🚀 Загрузка файлов в ${BUCKET_NAME}..."

# Сжатие изображений (опционально)
if command -v python3 &> /dev/null && [ -f "compress_images.py" ]; then
    echo "🗜️  Сжатие изображений..."
    python3 compress_images.py --min-size 20 --quality 85 2>/dev/null || true
fi

# Загружаем файлы с правильными Content-Type и Cache-Control
aws --endpoint-url=${ENDPOINT_URL} s3 sync ./ s3://${BUCKET_NAME}/ \
  --exclude ".DS_Store" \
  --exclude "__pycache__/*" \
  --exclude "*.pyc" \
  --exclude ".git/*" \
  --exclude "*.md" \
  --exclude "deploy*.sh" \
  --exclude "compress_images.py" \
  --exclude "start_server.py" \
  --exclude "*.py" \
  --exclude "*.tmp" \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --metadata-directive REPLACE

# Принудительно обновляем JS и CSS файлы с правильным Cache-Control
echo "Обновление Cache-Control для JS/CSS файлов..."
find src -type f \( -name "*.js" -o -name "*.css" \) | while read -r file; do
  if [ -f "$file" ]; then
    content_type="application/javascript; charset=utf-8"
    if [[ "$file" == *.css ]]; then
      content_type="text/css; charset=utf-8"
    fi
    aws --endpoint-url=${ENDPOINT_URL} s3 cp "${file}" "s3://${BUCKET_NAME}/${file}" \
      --content-type "${content_type}" \
      --cache-control "public, max-age=3600, must-revalidate" \
      --metadata-directive REPLACE 2>/dev/null || true
  fi
done

echo "✅ Готово! Сайт: https://${BUCKET_NAME}.website.yandexcloud.net"

