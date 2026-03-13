# Media API

Минимальный serverless backend для `ai-craft-media`.

Он решает две задачи:

- `GET /media/manifest` — отдает remote manifest для фронтенда
- `POST /media/presign-upload` — выдает presigned `PUT` URL для безопасной загрузки в приватный bucket
- `DELETE /media/object` — удаляет объект из managed prefixes
- `POST /media/publish` — переносит объект между `drafts/` и `published/`

## Что нужно на стороне Yandex Cloud

- `Object Storage` bucket: `ai-craft-media`
- `Cloud Function` с кодом из этой папки
- `API Gateway`, который проксирует HTTP в функцию
- сервисный аккаунт с доступом к bucket

## Быстрый деплой через yc

В папке уже есть:

- [deploy.sh](/Users/vidmich/Desktop/prac/serverless/media-api/deploy.sh)
- [gateway.openapi.yaml](/Users/vidmich/Desktop/prac/serverless/media-api/gateway.openapi.yaml)

Минимальный запуск:

```bash
cd /Users/vidmich/Desktop/prac/serverless/media-api
export YC_FOLDER_ID=<folder-id>
export MEDIA_BUCKET=ai-craft-media
export AWS_ACCESS_KEY_ID=<static-access-key>
export AWS_SECRET_ACCESS_KEY=<static-secret-key>
./deploy.sh
```

После этого останется подставить gateway URL в [config.remote-media.example.json](/Users/vidmich/Desktop/prac/config.remote-media.example.json) и сохранить как `config.json` в корне статики.

## Структура объектов в bucket

Публично видимые для приложения медиа лежат под префиксом:

```text
published/{folder1}/{folder2}/{filename}
```

Черновики/неопубликованные загрузки по умолчанию:

```text
drafts/{folder1}/{folder2}/{filename}
```

Примеры:

```text
published/pro/assets/1.webp
published/pro/bg/shape=triangle, inside=green, theme=dark.webp
published/3d/logos/12.webp
drafts/pro/assets/new-hero.webp
```

`folder1` и `folder2` специально совпадают с текущей фронтовой структурой `scanKV/scanBG`.

## Environment variables

См. пример в [.env.example](/Users/vidmich/Desktop/prac/serverless/media-api/.env.example).

Обязательные:

- `MEDIA_BUCKET`

Основные:

- `MEDIA_PUBLIC_PREFIX`
- `MEDIA_DRAFT_PREFIX`
- `MEDIA_URL_TTL_SECONDS`
- `MEDIA_SIGNED_GETS`
- `MEDIA_ALLOWED_ORIGINS`
- `MEDIA_ALLOWED_MIME_TYPES`
- `MEDIA_MAX_FILE_SIZE_BYTES`

## Контракт: GET /media/manifest

Поддерживает опциональные query params:

- `folder1`
- `folder2`

Пример ответа:

```json
{
  "ok": true,
  "generatedAt": "2026-03-13T12:00:00.000Z",
  "expiresIn": 900,
  "assets": {
    "pro": {
      "assets": [
        {
          "name": "1",
          "file": "https://presigned.example/object",
          "size": 182312,
          "etag": "abc123",
          "lastModified": "2026-03-13T11:50:00.000Z",
          "key": "published/pro/assets/1.webp"
        }
      ]
    }
  }
}
```

Этот формат уже совместим с текущим фронтом.

## Контракт: POST /media/presign-upload

Тело запроса:

```json
{
  "folder1": "pro",
  "folder2": "assets",
  "filename": "new-hero.webp",
  "contentType": "image/webp",
  "fileSize": 182312,
  "visibility": "draft"
}
```

Пример ответа:

```json
{
  "ok": true,
  "method": "PUT",
  "uploadUrl": "https://presigned.example/put",
  "key": "drafts/pro/assets/new-hero.webp",
  "headers": {
    "Content-Type": "image/webp"
  },
  "expiresIn": 900,
  "visibility": "draft",
  "maxFileSizeBytes": 10485760
}
```

После этого фронт делает обычный `fetch(uploadUrl, { method: 'PUT', headers, body: file })`.

## Минимальная схема API Gateway

Нужны два маршрута:

- `GET /media/manifest`
- `POST /media/presign-upload`
- `DELETE /media/object`
- `POST /media/publish`

Оба можно направить в одну и ту же функцию.

## Как подключить к фронту

В корневом `config.json`:

```json
{
  "mediaSources": {
    "remote": {
      "enabled": true,
      "label": "ai-craft-media",
      "manifestUrl": "https://<api-gateway-domain>/media/manifest",
      "baseUrl": ""
    }
  }
}
```

`baseUrl` можно оставить пустым, потому что manifest уже отдает готовые presigned URL.

## Контракт: DELETE /media/object

Тело запроса:

```json
{
  "key": "published/pro/assets/1.webp"
}
```

## Контракт: POST /media/publish

Тело запроса:

```json
{
  "key": "drafts/pro/assets/new-hero.webp",
  "visibility": "published"
}
```
