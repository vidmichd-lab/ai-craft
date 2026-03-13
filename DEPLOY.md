# Инструкция по деплою в Yandex Object Storage

Этот документ описывает процесс размещения статического сайта в бакете `ai-craft` на Yandex Object Storage.

## Предварительные требования

1. **Установите AWS CLI** (совместим с Yandex S3):
   ```bash
   # macOS
   brew install awscli
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install awscli
   
   # Или скачайте с официального сайта
   # https://aws.amazon.com/cli/
   ```

2. **Получите ключи доступа** в Yandex Cloud:
   - Перейдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
   - Откройте раздел "Сервисные аккаунты"
   - Создайте сервисный аккаунт или используйте существующий
   - Создайте статический ключ доступа

## Настройка AWS CLI для Yandex Object Storage

Настройте AWS CLI для работы с Yandex Object Storage:

```bash
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region ru-central1
```

Или создайте файл `~/.aws/credentials` вручную:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

И файл `~/.aws/config`:

```ini
[default]
region = ru-central1
```

## Создание бакета (если ещё не создан)

Если бакет `ai-craft` ещё не создан, создайте его через консоль Yandex Cloud или выполните:

```bash
aws --endpoint-url=https://storage.yandexcloud.net s3 mb s3://ai-craft
```

## Автоматический деплой

Используйте скрипт `deploy.sh` для автоматического деплоя:

```bash
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- ✅ Проверит наличие AWS CLI
- ✅ Проверит существование бакета (создаст, если нужно)
- ✅ Настроит публичный доступ
- ✅ Включит хостинг статического сайта
- ✅ Настроит CORS
- ✅ Загрузит все файлы проекта
- ✅ Установит правильные Content-Type для файлов

## Ручной деплой

Если хотите выполнить деплой вручную:

### 1. Загрузка файлов

```bash
aws --endpoint-url=https://storage.yandexcloud.net s3 sync ./ s3://ai-craft/ \
  --exclude ".DS_Store" \
  --exclude "__pycache__/*" \
  --exclude "*.pyc" \
  --exclude ".git/*" \
  --exclude "*.md" \
  --exclude "deploy.sh" \
  --exclude "start_server.py" \
  --delete
```

### 2. Настройка публичного доступа

В консоли Yandex Cloud:
1. Откройте бакет `ai-craft`
2. Перейдите в раздел "Доступ"
3. Включите "Публичный доступ на чтение объектов" и "Публичный доступ на чтение списка объектов"

Или через CLI:

```bash
aws --endpoint-url=https://storage.yandexcloud.net s3api put-bucket-acl \
  --bucket ai-craft \
  --acl public-read
```

### 3. Включение хостинга статического сайта

В консоли Yandex Cloud:
1. Откройте бакет `ai-craft`
2. Перейдите в раздел "Веб-сайт"
3. Включите хостинг
4. Укажите главную страницу: `index.html`
5. Укажите страницу ошибки: `index.html` (опционально)

Или через CLI:

```bash
cat > website-config.json << EOF
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
EOF

aws --endpoint-url=https://storage.yandexcloud.net s3api put-bucket-website \
  --bucket ai-craft \
  --website-configuration file://website-config.json

rm website-config.json
```

### 4. Настройка Content-Type

Убедитесь, что файлы имеют правильные Content-Type:

```bash
# HTML
aws --endpoint-url=https://storage.yandexcloud.net s3 cp \
  s3://ai-craft/index.html s3://ai-craft/index.html \
  --content-type "text/html; charset=utf-8" \
  --metadata-directive REPLACE

# CSS
aws --endpoint-url=https://storage.yandexcloud.net s3 cp \
  s3://ai-craft/styles.css s3://ai-craft/styles.css \
  --content-type "text/css; charset=utf-8" \
  --metadata-directive REPLACE

# JavaScript
aws --endpoint-url=https://storage.yandexcloud.net s3 cp \
  s3://ai-craft/src/main.js s3://ai-craft/src/main.js \
  --content-type "application/javascript; charset=utf-8" \
  --metadata-directive REPLACE
```

## Доступ к сайту

После деплоя сайт будет доступен по адресу:

**Основной URL:**
```
https://ai-craft.website.yandexcloud.net
```

**Альтернативный URL:**
```
https://ai-craft.storage.yandexcloud.net
```

## Настройка собственного домена (опционально)

1. В консоли Yandex Cloud откройте бакет `ai-craft`
2. Перейдите в раздел "Веб-сайт"
3. Укажите свой домен в настройках
4. Настройте DNS-запись CNAME, указывающую на хостинг Yandex Object Storage
5. В Yandex Certificate Manager добавьте TLS-сертификат для HTTPS

## Обновление сайта

Для обновления сайта просто запустите скрипт деплоя снова:

```bash
./deploy.sh
```

Скрипт автоматически синхронизирует изменения и удалит файлы, которых больше нет в локальной папке.

## Исключаемые файлы

При деплое автоматически исключаются:
- `.DS_Store` (системные файлы macOS)
- `__pycache__/` (кэш Python)
- `*.pyc` (скомпилированные файлы Python)
- `.git/` (репозиторий Git)
- `*.md` (документация)
- `deploy.sh` (скрипт деплоя)
- `start_server.py` (локальный сервер)

## Устранение проблем

### Ошибка доступа

Если получаете ошибку доступа, проверьте:
1. Правильность ключей доступа
2. Права сервисного аккаунта на бакет
3. Настройки публичного доступа

### Файлы не загружаются

Проверьте:
1. Наличие AWS CLI: `aws --version`
2. Настройку credentials: `aws configure list`
3. Доступность endpoint: `aws --endpoint-url=https://storage.yandexcloud.net s3 ls`

### Неправильные Content-Type

Если файлы загружаются с неправильным Content-Type, используйте команды из раздела "Настройка Content-Type" выше.

## Дополнительные ресурсы

- [Документация Yandex Object Storage](https://cloud.yandex.ru/docs/storage/)
- [Документация AWS CLI](https://docs.aws.amazon.com/cli/)
- [Настройка хостинга статического сайта](https://cloud.yandex.ru/docs/storage/operations/hosting/setup)
