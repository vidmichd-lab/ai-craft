#!/bin/bash

# Скрипт для деплоя статического сайта в Yandex Object Storage
# Бакет: practicum-banners
#
# Режимы: по умолчанию — только изменённые файлы (MD5 vs ETag).
#         ./deploy.sh --full — полная синхронизация и удаление с S3.

set -e

BUCKET_NAME="practicum-banners"
ENDPOINT_URL="https://storage.yandexcloud.net"
LOCAL_DIR="."

# Режим деплоя: 0 = только изменённые (по хешу), 1 = полная синхронизация (sync + удаление)
FULL_DEPLOY=0
if [ "${1:-}" = "--full" ]; then
  FULL_DEPLOY=1
fi

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Начинаем деплой в Yandex Object Storage${NC}"
echo "Бакет: ${BUCKET_NAME}"
if [ "$FULL_DEPLOY" -eq 1 ]; then
  echo -e "${YELLOW}FULL: полная синхронизация (sync), удаление отсутствующих файлов${NC}"
else
  echo -e "${GREEN}Только изменения: загрузка файлов с изменённым содержимым (по хешу)${NC}"
fi
echo ""

# Проверка наличия AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI не установлен${NC}"
    echo "Установите AWS CLI:"
    echo "  macOS: brew install awscli"
    echo "  Linux: sudo apt-get install awscli"
    echo "  Или: https://aws.amazon.com/cli/"
    exit 1
fi

# Проверка конфигурации AWS CLI
if ! aws configure list &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI не настроен${NC}"
    echo "Настройте AWS CLI для работы с Yandex Object Storage:"
    echo "  aws configure set aws_access_key_id YOUR_ACCESS_KEY"
    echo "  aws configure set aws_secret_access_key YOUR_SECRET_KEY"
    echo "  aws configure set region ru-central1"
    echo ""
    echo "Или создайте файл ~/.aws/credentials:"
    echo "  [default]"
    echo "  aws_access_key_id = YOUR_ACCESS_KEY"
    echo "  aws_secret_access_key = YOUR_SECRET_KEY"
    exit 1
fi

# Проверка существования бакета
echo -e "${YELLOW}📦 Проверка бакета...${NC}"
if ! aws --endpoint-url=${ENDPOINT_URL} s3 ls "s3://${BUCKET_NAME}" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Бакет не найден. Создаём бакет...${NC}"
    if aws --endpoint-url=${ENDPOINT_URL} s3 mb "s3://${BUCKET_NAME}" 2>/dev/null; then
        echo -e "${GREEN}✅ Бакет создан${NC}"
    else
        echo -e "${RED}❌ Не удалось создать бакет${NC}"
        echo "   Возможно, бакет уже существует или недостаточно прав"
        echo "   Продолжаем выполнение..."
    fi
fi

# Настройка публичного доступа (опционально, может требовать storage.admin)
echo -e "${YELLOW}🔓 Настройка публичного доступа...${NC}"
if aws --endpoint-url=${ENDPOINT_URL} s3api put-bucket-acl \
    --bucket "${BUCKET_NAME}" \
    --acl public-read 2>/dev/null; then
    echo -e "${GREEN}✅ Публичный доступ настроен${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось настроить публичный доступ через CLI${NC}"
    echo "   Настройте публичный доступ вручную через веб-интерфейс:"
    echo "   1. Откройте бакет ${BUCKET_NAME} в Yandex Cloud Console"
    echo "   2. Перейдите в раздел 'Доступ'"
    echo "   3. Включите 'Публичный доступ на чтение объектов'"
    echo "   4. Включите 'Публичный доступ на чтение списка объектов'"
    echo ""
fi

# Включение хостинга статического сайта
echo -e "${YELLOW}🌐 Настройка хостинга статического сайта...${NC}"
cat > /tmp/website-config.json << EOF
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
EOF

if aws --endpoint-url=${ENDPOINT_URL} s3api put-bucket-website \
    --bucket "${BUCKET_NAME}" \
    --website-configuration file:///tmp/website-config.json 2>/dev/null; then
    echo -e "${GREEN}✅ Хостинг статического сайта настроен${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось настроить хостинг через CLI${NC}"
    echo "   Настройте хостинг вручную через веб-интерфейс:"
    echo "   1. Откройте бакет ${BUCKET_NAME} в Yandex Cloud Console"
    echo "   2. Перейдите в раздел 'Веб-сайт'"
    echo "   3. Включите хостинг"
    echo "   4. Укажите главную страницу: index.html"
    echo ""
fi

rm /tmp/website-config.json

# Настройка CORS (критично для работы fetch и загрузки ресурсов)
echo -e "${YELLOW}🌍 Настройка CORS...${NC}"
cat > /tmp/cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF

if aws --endpoint-url=${ENDPOINT_URL} s3api put-bucket-cors \
    --bucket "${BUCKET_NAME}" \
    --cors-configuration file:///tmp/cors-config.json 2>/dev/null; then
    echo -e "${GREEN}✅ CORS настроен${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось настроить CORS через CLI${NC}"
    echo "   Настройте CORS вручную через веб-интерфейс:"
    echo "   1. Откройте бакет ${BUCKET_NAME} в Yandex Cloud Console"
    echo "   2. Перейдите в раздел 'CORS'"
    echo "   3. Добавьте правило:"
    echo "      - Allowed Origins: *"
    echo "      - Allowed Methods: GET, HEAD, OPTIONS"
    echo "      - Allowed Headers: *"
    echo ""
fi

rm /tmp/cors-config.json

# Проверяем, есть ли PNG/JPG файлы без соответствующих WebP версий
echo -e "${YELLOW}🔍 Проверка изображений для конвертации...${NC}"
NEEDS_CONVERSION=false

# Проверяем наличие PNG/JPG файлов без WebP версий
if [ -d "assets" ]; then
    # Ищем PNG/JPG файлы, для которых нет соответствующих WebP
    UNCONVERTED=""
    while IFS= read -r -d '' img_file; do
        webp_file="${img_file%.*}.webp"
        if [ ! -f "$webp_file" ]; then
            UNCONVERTED="$img_file"
            break
        fi
    done < <(find assets -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -print0 2>/dev/null)
    
    if [ -n "$UNCONVERTED" ]; then
        NEEDS_CONVERSION=true
        echo "  Найдены изображения без WebP версий для конвертации"
    else
        echo "  Все изображения уже конвертированы в WebP"
    fi
else
    echo "  Папка assets не найдена"
fi

# Конвертируем только если есть файлы без WebP версий
if [ "$NEEDS_CONVERSION" = true ]; then
    echo -e "${YELLOW}🗜️  Сжатие и конвертация PNG в WebP (качество 50%, макс. 2 МБ)...${NC}"
    if command -v python3 &> /dev/null; then
        if python3 compress_images.py assets --min-size 0 --quality 50 --max-size 2.0 --webp 2>/dev/null; then
            echo -e "${GREEN}✅ Изображения сжаты и конвертированы в WebP${NC}"
        else
            echo -e "${YELLOW}⚠️  Не удалось сжать изображения (продолжаем без сжатия)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Python3 не найден, пропускаем сжатие изображений${NC}"
    fi
else
    echo -e "${GREEN}✅ Все изображения уже конвертированы, пропускаем конвертацию${NC}"
fi
echo ""

# Проверяем и конвертируем новые шрифты в WOFF2
echo -e "${YELLOW}🔤 Проверка новых шрифтов...${NC}"
NEW_FONTS=false

# Проверяем изменения в папке font
if command -v git &> /dev/null && [ -d .git ]; then
    FONT_CHANGES=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | grep -E 'font/.*\.(ttf|otf|woff)$' || true)
    if [ -z "$FONT_CHANGES" ]; then
        FONT_CHANGES=$(git diff --name-only --diff-filter=A 2>/dev/null | grep -E 'font/.*\.(ttf|otf|woff)$' || true)
    fi
    if [ -n "$FONT_CHANGES" ]; then
        NEW_FONTS=true
        echo "  Найдены новые шрифты для конвертации в WOFF2"
    fi
else
    # Если git недоступен, проверяем наличие недавно измененных шрифтов (за последние 5 минут)
    RECENT_FONTS=$(find font -type f \( -name "*.ttf" -o -name "*.otf" -o -name "*.woff" \) ! -name "*.woff2" -mmin -5 2>/dev/null | head -1 || true)
    if [ -n "$RECENT_FONTS" ]; then
        NEW_FONTS=true
        echo "  Найдены недавно измененные шрифты"
    fi
fi

# Конвертируем шрифты в WOFF2 только если были добавлены новые
if [ "$NEW_FONTS" = true ]; then
    echo -e "${YELLOW}🔄 Конвертация новых шрифтов в WOFF2...${NC}"
    if command -v python3 &> /dev/null; then
        if python3 convert_fonts_to_woff2.py 2>/dev/null; then
            echo -e "${GREEN}✅ Шрифты конвертированы в WOFF2${NC}"
        else
            echo -e "${YELLOW}⚠️  Не удалось конвертировать шрифты (продолжаем без конвертации)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Python3 не найден, пропускаем конвертацию шрифтов${NC}"
    fi
else
    echo -e "${GREEN}✅ Новых шрифтов не обнаружено, пропускаем конвертацию${NC}"
fi
echo ""

# Загрузка файлов (только изменённые)
echo -e "${YELLOW}📤 Загрузка файлов (только изменённые)...${NC}"

# Функция для определения Content-Type по расширению файла
get_content_type() {
    local file=$1
    local ext="${file##*.}"
    case "$ext" in
        html) echo "text/html; charset=utf-8" ;;
        css) echo "text/css; charset=utf-8" ;;
        js) echo "application/javascript; charset=utf-8" ;;
        json) echo "application/json; charset=utf-8" ;;
        png) echo "image/png" ;;
        jpg|jpeg) echo "image/jpeg" ;;
        gif) echo "image/gif" ;;
        webp) echo "image/webp" ;;
        svg) echo "image/svg+xml; charset=utf-8" ;;
        ttf) echo "font/ttf" ;;
        woff) echo "font/woff" ;;
        woff2) echo "font/woff2" ;;
        otf) echo "font/otf" ;;
        *) echo "application/octet-stream" ;;
    esac
}

# Функция для определения Cache-Control по типу файла
# Настройки оптимизированы для автоматического обновления без необходимости очистки кеша
get_cache_control() {
    local file=$1
    local ext="${file##*.}"
    case "$ext" in
        html) 
            # HTML файлы проверяются на актуальность при каждой загрузке
            # no-cache означает, что браузер должен проверять сервер перед использованием кеша
            echo "no-cache, must-revalidate, max-age=0" 
            ;;
        css|js) 
            # JS/CSS файлы проверяются на обновления при каждой загрузке
            # Используем no-cache вместо max-age=0 для лучшей совместимости
            echo "no-cache, must-revalidate" 
            ;;
        json) 
            # JSON файлы (конфигурация) тоже должны обновляться
            echo "no-cache, must-revalidate" 
            ;;
        png|jpg|jpeg|gif|webp|svg|ico) 
            # Изображения кешируются долго, так как они редко меняются
            echo "public, max-age=31536000, immutable" 
            ;;
        ttf|woff|woff2|otf|eot) 
            # Шрифты кешируются долго
            echo "public, max-age=31536000, immutable" 
            ;;
        *) 
            # Остальные файлы кешируются на день
            echo "public, max-age=86400" 
            ;;
    esac
}

# Функция для получения локального хеша файла (MD5)
get_local_hash() {
    local file=$1
    if [ ! -f "$file" ] || [ ! -r "$file" ]; then
        echo ""
        return
    fi
    (md5 -q "$file" 2>/dev/null || (md5sum "$file" 2>/dev/null | cut -d' ' -f1)) || echo ""
}

# Функция для загрузки файла с правильным Content-Type и Cache-Control
upload_with_content_type() {
    local file=$1
    local content_type=$(get_content_type "$file")
    local cache_control=$(get_cache_control "$file")
    local s3_path="s3://${BUCKET_NAME}/${file}"
    
    aws --endpoint-url=${ENDPOINT_URL} s3 cp "${file}" "${s3_path}" \
        --content-type "${content_type}" \
        --cache-control "${cache_control}" \
        --metadata-directive REPLACE 2>/dev/null || true
}

# Получаем список изменённых файлов через --dryrun
if [ "$FULL_DEPLOY" -eq 1 ]; then
echo "  Проверка изменённых файлов..."
SYNC_OUTPUT=$(aws --endpoint-url=${ENDPOINT_URL} s3 sync "${LOCAL_DIR}" "s3://${BUCKET_NAME}/" \
    --exclude ".DS_Store" \
    --exclude "__pycache__/*" \
    --exclude "*.pyc" \
    --exclude ".git/*" \
    --exclude ".gitignore" \
    --exclude "deploy*.sh" \
    --exclude "compress_images.py" \
    --exclude "DEPLOY.md" \
    --exclude "TROUBLESHOOTING.md" \
    --exclude "YANDEX_CLOUD_SETUP.md" \
    --exclude "*.md" \
    --exclude "start_server.py" \
    --exclude "*.py" \
    --exclude "*.tmp" \
    --dryrun 2>&1)

# Извлекаем список файлов для загрузки и удаления
# Используем более надежный парсинг, который обрабатывает пути с пробелами
# Формат вывода aws s3 sync: "upload: ./file.txt to s3://bucket/file.txt"
UPLOAD_FILES=""
DELETE_FILES=""
while IFS= read -r line; do
    # Извлекаем путь после "s3://bucket/"
    if [[ "$line" =~ upload:.*to\ s3://[^/]+/(.+) ]]; then
        file_path="${BASH_REMATCH[1]}"
        if [ -n "$file_path" ]; then
            UPLOAD_FILES="${UPLOAD_FILES}${UPLOAD_FILES:+$'\n'}${file_path}"
        fi
    fi
done < <(echo "$SYNC_OUTPUT" | grep "upload:" || true)

while IFS= read -r line; do
    # Формат вывода: "delete: s3://bucket/file.txt"
    if [[ "$line" =~ delete:\ s3://[^/]+/(.+) ]]; then
        file_path="${BASH_REMATCH[1]}"
        if [ -n "$file_path" ]; then
            DELETE_FILES="${DELETE_FILES}${DELETE_FILES:+$'\n'}${file_path}"
        fi
    fi
done < <(echo "$SYNC_OUTPUT" | grep "delete:" || true)

# Более надежный подсчет файлов (обрабатывает пустые строки и отсутствие файлов)
UPLOAD_COUNT=0
if [ -n "$UPLOAD_FILES" ]; then
    UPLOAD_COUNT=$(echo "$UPLOAD_FILES" | grep -v '^$' | wc -l | tr -d ' ')
    # Если wc -l вернул пустую строку, значит файлов нет
    [ -z "$UPLOAD_COUNT" ] && UPLOAD_COUNT=0
fi
DELETE_COUNT=0
if [ -n "$DELETE_FILES" ]; then
    DELETE_COUNT=$(echo "$DELETE_FILES" | grep -v '^$' | wc -l | tr -d ' ')
    [ -z "$DELETE_COUNT" ] && DELETE_COUNT=0
fi

# Принудительно проверяем JS и CSS файлы, так как они могут не обнаруживаться при изменении без изменения размера
FORCE_UPLOAD_FILES=""
if [ -d "src" ]; then
    FORCE_CHECK_FILES=$(find src -type f \( -name "*.js" -o -name "*.css" \) 2>/dev/null || true)
fi
if [ -n "$FORCE_CHECK_FILES" ]; then
    echo "  Проверка JS/CSS файлов на изменения..."
    while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ] && [ -r "$file" ]; then
            # Проверяем, есть ли файл в списке для загрузки
            # Используем grep -F для точного совпадения (без интерпретации спецсимволов)
            if ! echo "$UPLOAD_FILES" | grep -Fxq "$file"; then
                # Проверяем, изменился ли файл (сравниваем по MD5)
                LOCAL_HASH=$(get_local_hash "$file")
                if [ -n "$LOCAL_HASH" ]; then
                    # Получаем ETag из S3 (обычно это MD5)
                    S3_ETAG=$(aws --endpoint-url=${ENDPOINT_URL} s3api head-object --bucket "${BUCKET_NAME}" --key "${file}" --query 'ETag' --output text 2>/dev/null | tr -d '"' || echo "")
                    if [ -z "$S3_ETAG" ] || [ "$LOCAL_HASH" != "$S3_ETAG" ]; then
                        # Файл изменился или не существует, добавляем в список для загрузки
                        if [ -z "$FORCE_UPLOAD_FILES" ]; then
                            FORCE_UPLOAD_FILES="$file"
                        else
                            FORCE_UPLOAD_FILES="${FORCE_UPLOAD_FILES}"$'\n'"${file}"
                        fi
                        echo "    ⚠️  Обнаружено изменение в ${file}"
                    fi
                fi
            fi
        fi
    done <<< "$FORCE_CHECK_FILES"
fi

# Объединяем списки файлов для загрузки
if [ -n "$FORCE_UPLOAD_FILES" ]; then
    if [ -z "$UPLOAD_FILES" ]; then
        UPLOAD_FILES="$FORCE_UPLOAD_FILES"
    else
        UPLOAD_FILES="${UPLOAD_FILES}"$'\n'"${FORCE_UPLOAD_FILES}"
    fi
fi

# Пересчитываем количество файлов после объединения списков
UPLOAD_COUNT=0
if [ -n "$UPLOAD_FILES" ]; then
    UPLOAD_COUNT=$(echo "$UPLOAD_FILES" | grep -v '^$' | wc -l | tr -d ' ')
    [ -z "$UPLOAD_COUNT" ] && UPLOAD_COUNT=0
fi

if [ "$UPLOAD_COUNT" -gt 0 ] || [ "$DELETE_COUNT" -gt 0 ]; then
    echo "  Найдено изменений: $UPLOAD_COUNT файлов для загрузки, $DELETE_COUNT для удаления"
    
    # Загружаем изменённые файлы с правильным Content-Type
    if [ "$UPLOAD_COUNT" -gt 0 ]; then
        echo "  Загрузка изменённых файлов с правильным Content-Type..."
        echo "$UPLOAD_FILES" | grep -v '^$' | while read -r file; do
            if [ -n "$file" ] && [ -f "$file" ]; then
                content_type=$(get_content_type "$file")
                cache_control=$(get_cache_control "$file")
                echo "    📤 Загружаем: ${file}"
                aws --endpoint-url=${ENDPOINT_URL} s3 cp "${file}" "s3://${BUCKET_NAME}/${file}" \
                    --content-type "${content_type}" \
                    --cache-control "${cache_control}" \
                    --metadata-directive REPLACE 2>/dev/null || true
            fi
        done
    fi
    
    # Удаляем файлы, которые были удалены локально
    if [ "$DELETE_COUNT" -gt 0 ]; then
        echo "  Удаление файлов..."
        echo "$DELETE_FILES" | grep -v '^$' | while read -r file; do
            if [ -n "$file" ]; then
                aws --endpoint-url=${ENDPOINT_URL} s3 rm "s3://${BUCKET_NAME}/${file}" 2>/dev/null || true
            fi
        done
    fi
    
    echo "  ✅ Синхронизация завершена (загружены только изменённые файлы)"
  else
    echo "  Изменений не обнаружено, всё актуально"
    echo "  💡 Если изменения не отображаются, попробуйте:"
    echo "     1. Очистить кэш браузера (Ctrl+Shift+R или Cmd+Shift+R)"
    echo "     2. Запустить деплой с принудительной загрузкой: ./deploy.sh --full"
fi
else
  # ========== Только изменённые: манифест (mtime+size) → хеш и S3 только для изменённых ==========
  MANIFEST_FILE=".deploy-manifest"
  get_stat() {
    local f="$1"
    if [ -f "$f" ]; then
      stat -f '%m %z' "$f" 2>/dev/null || stat -c '%Y %s' "$f" 2>/dev/null || echo ""
    fi
  }

  ALL_FILES=$(find . -type f \
    ! -path './.git/*' \
    ! -path './__pycache__/*' \
    ! -path './node_modules/*' \
    ! -name '.DS_Store' \
    ! -name '*.pyc' \
    ! -name '*.py' \
    ! -name '*.md' \
    ! -name '*.tmp' \
    ! -name '.gitignore' \
    ! -name '.gitattributes' \
    ! -name 'compress_images.py' \
    ! -name 'start_server.py' \
    ! -name 'deploy.sh' \
    ! -name 'deploy-*.sh' \
    ! -name 'run_*.sh' \
    ! -name 'DEPLOY.md' \
    ! -name 'TROUBLESHOOTING.md' \
    ! -name 'YANDEX_CLOUD_SETUP.md' \
    -print 2>/dev/null | sed 's|^\./||' | grep -v '^$' || true)

  TOTAL_FILES=$(echo "$ALL_FILES" | grep -c . 2>/dev/null || echo 0)
  TO_CHECK=""
  if [ -f "$MANIFEST_FILE" ]; then
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      [ ! -f "$file" ] && continue
      current=$(get_stat "$file")
      [ -z "$current" ] && { TO_CHECK="${TO_CHECK}${TO_CHECK:+$'\n'}${file}"; continue; }
      want="${file}	${current}"
      if ! grep -Fxq "$want" "$MANIFEST_FILE" 2>/dev/null; then
        TO_CHECK="${TO_CHECK}${TO_CHECK:+$'\n'}${file}"
      fi
    done <<< "$ALL_FILES"
  else
    echo "  Манифест не найден — первая проверка по хешу (один раз)."
    TO_CHECK="$ALL_FILES"
  fi

  TO_CHECK_COUNT=$(echo "$TO_CHECK" | grep -c . 2>/dev/null || echo 0)
  echo "  Файлов к проверке (изменённые/новые): $TO_CHECK_COUNT из $TOTAL_FILES"

  UPLOAD_FILES=""
  if [ "$TO_CHECK_COUNT" -gt 0 ]; then
    UPLOAD_LIST=$(mktemp)
    trap "rm -f '$UPLOAD_LIST'" EXIT
    CHECKED=0
    BATCH_SIZE=25
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      if [ -f "$file" ]; then
        (
          h=$(get_local_hash "$file")
          if [ -n "$h" ]; then
            e=$(aws --endpoint-url="${ENDPOINT_URL}" s3api head-object --bucket "${BUCKET_NAME}" --key "$file" --query 'ETag' --output text 2>/dev/null | tr -d '"' || echo "")
            if [ -z "$e" ] || [ "$h" != "$e" ]; then
              echo "$file" >> "$UPLOAD_LIST"
            fi
          fi
        ) &
        CHECKED=$((CHECKED + 1))
        if [ $((CHECKED % BATCH_SIZE)) -eq 0 ]; then
          wait
        fi
      fi
    done <<< "$TO_CHECK"
    wait
    UPLOAD_FILES=$(cat "$UPLOAD_LIST" 2>/dev/null | grep -v '^$' || true)
    rm -f "$UPLOAD_LIST"
    trap - EXIT
  fi

  # Обновляем манифест после проверки (текущие mtime+size по всем файлам)
  MANIFEST_TMP=$(mktemp)
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    if [ -f "$file" ]; then
      s=$(get_stat "$file")
      [ -n "$s" ] && printf '%s\t%s\n' "$file" "$s" >> "$MANIFEST_TMP"
    fi
  done <<< "$ALL_FILES"
  mv "$MANIFEST_TMP" "$MANIFEST_FILE"

  UPLOAD_COUNT=0
  if [ -n "$UPLOAD_FILES" ]; then
    UPLOAD_COUNT=$(echo "$UPLOAD_FILES" | grep -v '^$' | wc -l | tr -d ' ')
    [ -z "$UPLOAD_COUNT" ] && UPLOAD_COUNT=0
  fi

  if [ "$UPLOAD_COUNT" -gt 0 ]; then
    echo "  Найдено изменений: $UPLOAD_COUNT файлов для загрузки"
    echo "  Загрузка изменённых файлов с правильным Content-Type..."
    echo "$UPLOAD_FILES" | grep -v '^$' | while read -r file; do
      if [ -n "$file" ] && [ -f "$file" ]; then
        content_type=$(get_content_type "$file")
        cache_control=$(get_cache_control "$file")
        echo "    📤 Загружаем: ${file}"
        aws --endpoint-url=${ENDPOINT_URL} s3 cp "${file}" "s3://${BUCKET_NAME}/${file}" \
          --content-type "${content_type}" \
          --cache-control "${cache_control}" \
          --metadata-directive REPLACE 2>/dev/null || true
      fi
    done
    echo "  ✅ Синхронизация завершена (загружены только изменённые файлы)"
  else
    echo "  Изменений не обнаружено, всё актуально"
    echo "  💡 Для полной синхронизации: ./deploy.sh --full. Сброс кеша: rm .deploy-manifest"
  fi
fi

# Content-Type уже установлены в процессе загрузки выше

# Очищаем старые PNG/JPG из бакета после конвертации в WebP
echo ""
echo -e "${YELLOW}🧹 Очистка старых PNG/JPG из бакета (заменены на WebP)...${NC}"
if command -v aws &> /dev/null; then
    # Находим все PNG и JPG в бакете в папке assets
    # Формат вывода aws s3 ls: "DATE TIME SIZE path/to/file.png"
    # Извлекаем путь (все после третьего поля - размера файла)
    OLD_IMAGES=$(aws --endpoint-url=${ENDPOINT_URL} s3 ls "s3://${BUCKET_NAME}/assets/" --recursive 2>/dev/null | \
        grep -E '\.(png|jpg|jpeg)$' | sed 's/^[^ ]* [^ ]* [^ ]* //' || true)
    
    if [ -n "$OLD_IMAGES" ]; then
        OLD_COUNT=$(echo "$OLD_IMAGES" | grep -v '^$' | wc -l | tr -d ' ')
        [ -z "$OLD_COUNT" ] && OLD_COUNT=0
        echo "  Найдено старых изображений для удаления: $OLD_COUNT"
        
        # Проверяем, есть ли соответствующий WebP файл перед удалением
        echo "$OLD_IMAGES" | grep -v '^$' | while read -r old_file; do
            # Получаем путь без расширения
            base_path="${old_file%.*}"
            # Проверяем, существует ли WebP версия
            webp_file="${base_path}.webp"
            # Более надежная проверка существования файла в S3
            if aws --endpoint-url=${ENDPOINT_URL} s3api head-object --bucket "${BUCKET_NAME}" --key "${webp_file}" &>/dev/null; then
                # WebP версия существует, удаляем старый файл
                aws --endpoint-url=${ENDPOINT_URL} s3 rm "s3://${BUCKET_NAME}/${old_file}" 2>/dev/null && \
                    echo "    ✓ Удалён: ${old_file} (есть WebP версия)"
            fi
        done
        echo -e "${GREEN}✅ Очистка завершена${NC}"
    else
        echo "  Старых изображений не найдено"
    fi
else
    echo -e "${YELLOW}⚠️  AWS CLI не найден, пропускаем очистку${NC}"
fi

echo ""
echo -e "${GREEN}✅ Деплой завершён успешно!${NC}"
echo ""
echo "🌐 Ваш сайт доступен по адресу:"
echo "   https://${BUCKET_NAME}.website.yandexcloud.net"
echo ""
echo "📋 Или через прямой URL бакета:"
echo "   https://${BUCKET_NAME}.storage.yandexcloud.net"
echo ""

