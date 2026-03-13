# Remote Media API

Этот документ фиксирует минимальный backend-контракт для работы приложения с приватным bucket `ai-craft-media`.

## Зачем нужен backend

`ai-craft-media` приватный, поэтому браузер не может:

- безопасно листать содержимое bucket
- загружать файлы без контролируемого доступа
- читать объекты по обычным S3 URL

Поэтому фронтенд работает через маленький API-слой:

1. `GET /media/manifest`
2. `POST /media/presign-upload`
3. `DELETE /media/object`
4. `POST /media/publish`

Референс-реализация лежит в [serverless/media-api/index.mjs](/Users/vidmich/Desktop/prac/serverless/media-api/index.mjs).

## Маршрут 1: manifest

`GET /media/manifest`

Назначение:

- получить удалённые ассеты в формате, совместимом с текущим фронтом
- вернуть либо presigned `GET` URLs, либо уже готовые публичные URLs

Ответ:

```json
{
  "ok": true,
  "generatedAt": "2026-03-13T12:00:00.000Z",
  "expiresIn": 900,
  "assets": {
    "3d": {
      "logos": [
        {
          "name": "12",
          "file": "https://...",
          "key": "published/3d/logos/12.webp"
        }
      ]
    }
  }
}
```

Этот ответ фронт уже умеет читать через `src/utils/assetScanner.js`.

## Маршрут 2: presign upload

`POST /media/presign-upload`

Назначение:

- выдать короткоживущий `PUT` URL для загрузки файла в bucket

Пример запроса:

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
  "uploadUrl": "https://...",
  "key": "drafts/pro/assets/new-hero.webp",
  "headers": {
    "Content-Type": "image/webp"
  },
  "expiresIn": 900
}
```

## Маршрут 3: delete object

`DELETE /media/object`

Пример запроса:

```json
{
  "key": "published/pro/assets/1.webp"
}
```

## Маршрут 4: publish / unpublish

`POST /media/publish`

Пример запроса:

```json
{
  "key": "drafts/pro/assets/new-hero.webp",
  "visibility": "published"
}
```

## Рекомендуемая модель данных

Публикуемые в приложение файлы:

```text
published/{folder1}/{folder2}/{filename}
```

Черновики:

```text
drafts/{folder1}/{folder2}/{filename}
```

Пример соответствия текущей UI-структуре:

- `published/3d/logos/01.webp`
- `published/3d/numbers/07.webp`
- `published/pro/assets/1.webp`
- `published/pro/bg/shape=triangle, inside=green, theme=dark.webp`

## Следующий шаг после этого

Когда этот API будет поднят:

1. прописать `manifestUrl` в `config.json`
2. добавить во фронт вызов `POST /media/presign-upload`
3. перевести админскую загрузку ассетов на presigned uploads
4. позже добавить publish/unpublish/delete endpoints
