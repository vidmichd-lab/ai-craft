#!/bin/bash

# Скрипт для деплоя статического сайта в Yandex Object Storage
# Бакет: practicum-banners

set -e

BUCKET_NAME="practicum-banners"
ENDPOINT_URL="https://storage.yandexcloud.net"
LOCAL_DIR="."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Начинаем деплой в Yandex Object Storage${NC}"
echo "Бакет: ${BUCKET_NAME}"
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
    aws --endpoint-url=${ENDPOINT_URL} s3 mb "s3://${BUCKET_NAME}"
    echo -e "${GREEN}✅ Бакет создан${NC}"
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
    UNCONVERTED=$(find assets -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null | while read -r img_file; do
        webp_file="${img_file%.*}.webp"
        if [ ! -f "$webp_file" ]; then
            echo "$img_file"
        fi
    done | head -1)
    
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
get_cache_control() {
    local file=$1
    local ext="${file##*.}"
    case "$ext" in
        html) echo "public, max-age=0, must-revalidate" ;;
        css|js) echo "public, max-age=3600, must-revalidate" ;;
        json) echo "public, max-age=3600" ;;
        png|jpg|jpeg|gif|webp|svg|ico) echo "public, max-age=31536000, immutable" ;;
        ttf|woff|woff2|otf|eot) echo "public, max-age=31536000, immutable" ;;
        *) echo "public, max-age=86400" ;;
    esac
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
UPLOAD_FILES=$(echo "$SYNC_OUTPUT" | grep "upload:" | sed 's/.*upload: //' | sed 's/.*to s3:\/\/[^/]*\///' || true)
DELETE_FILES=$(echo "$SYNC_OUTPUT" | grep "delete:" | sed 's/.*delete: s3:\/\/[^/]*\///' || true)

UPLOAD_COUNT=$(echo "$UPLOAD_FILES" | grep -v '^$' | wc -l | tr -d ' ')
DELETE_COUNT=$(echo "$DELETE_FILES" | grep -v '^$' | wc -l | tr -d ' ')

# Принудительно проверяем JS и CSS файлы, так как они могут не обнаруживаться при изменении без изменения размера
FORCE_UPLOAD_FILES=""
FORCE_CHECK_FILES=$(find src -type f \( -name "*.js" -o -name "*.css" \) 2>/dev/null || true)
if [ -n "$FORCE_CHECK_FILES" ]; then
    echo "  Проверка JS/CSS файлов на изменения..."
    while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            # Проверяем, есть ли файл в списке для загрузки
            if ! echo "$UPLOAD_FILES" | grep -q "^${file}$"; then
                # Проверяем, изменился ли файл (сравниваем по MD5)
                LOCAL_HASH=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | cut -d' ' -f1 || echo "")
                if [ -n "$LOCAL_HASH" ]; then
                    # Получаем ETag из S3 (обычно это MD5)
                    S3_ETAG=$(aws --endpoint-url=${ENDPOINT_URL} s3api head-object --bucket "${BUCKET_NAME}" --key "${file}" --query 'ETag' --output text 2>/dev/null | tr -d '"' || echo "")
                    if [ -z "$S3_ETAG" ] || [ "$LOCAL_HASH" != "$S3_ETAG" ]; then
                        # Файл изменился или не существует, добавляем в список для загрузки
                        FORCE_UPLOAD_FILES="${FORCE_UPLOAD_FILES}
${file}"
                        echo "    ⚠️  Обнаружено изменение в ${file}"
                    fi
                fi
            fi
        fi
    done <<< "$FORCE_CHECK_FILES"
fi

# Объединяем списки файлов для загрузки
if [ -n "$FORCE_UPLOAD_FILES" ]; then
    UPLOAD_FILES="${UPLOAD_FILES}${FORCE_UPLOAD_FILES}"
fi

UPLOAD_COUNT=$(echo "$UPLOAD_FILES" | grep -v '^$' | wc -l | tr -d ' ')

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
    echo "     2. Запустить деплой с принудительной загрузкой всех JS файлов"
fi

# Content-Type уже установлены в процессе загрузки выше

# Очищаем старые PNG/JPG из бакета после конвертации в WebP
echo ""
echo -e "${YELLOW}🧹 Очистка старых PNG/JPG из бакета (заменены на WebP)...${NC}"
if command -v aws &> /dev/null; then
    # Находим все PNG и JPG в бакете в папке assets
    OLD_IMAGES=$(aws --endpoint-url=${ENDPOINT_URL} s3 ls "s3://${BUCKET_NAME}/assets/" --recursive 2>/dev/null | \
        grep -E '\.(png|jpg|jpeg)$' | awk '{print $4}' || true)
    
    if [ -n "$OLD_IMAGES" ]; then
        OLD_COUNT=$(echo "$OLD_IMAGES" | grep -v '^$' | wc -l | tr -d ' ')
        echo "  Найдено старых изображений для удаления: $OLD_COUNT"
        
        # Проверяем, есть ли соответствующий WebP файл перед удалением
        echo "$OLD_IMAGES" | grep -v '^$' | while read -r old_file; do
            # Получаем путь без расширения
            base_path="${old_file%.*}"
            # Проверяем, существует ли WebP версия
            webp_file="${base_path}.webp"
            webp_exists=$(aws --endpoint-url=${ENDPOINT_URL} s3 ls "s3://${BUCKET_NAME}/${webp_file}" 2>/dev/null | wc -l | tr -d ' ')
            
            if [ "$webp_exists" -gt 0 ]; then
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

