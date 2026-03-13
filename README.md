# Генератор макетов

Веб-приложение для генерации макетов с различными размерами.

## Запуск проекта

### Способ 1: Использование Python скрипта (рекомендуется)

```bash
python3 start_server.py
```

Или:

```bash
./start_server.py
```

Сервер автоматически откроется в браузере на `http://localhost:8000`

### Способ 2: Использование встроенного HTTP сервера Python

```bash
python3 -m http.server 8000
```

Затем откройте в браузере: `http://localhost:8000`

### Способ 3: Использование Python HTTP сервера (Python 2)

```bash
python -m SimpleHTTPServer 8000
```

## Остановка сервера

Нажмите `Ctrl+C` в терминале, где запущен сервер.

## Требования

- Python 3.x (для запуска локального сервера)
- Современный браузер с поддержкой ES6 модулей

## Структура проекта

```
prac/
├── index.html          # Главный HTML файл
├── src/                # Исходный код JavaScript
│   ├── main.js        # Точка входа
│   ├── renderer.js    # Рендеринг на canvas
│   └── ...
├── assets/            # Изображения и ресурсы
├── font/              # Шрифты
└── logo/              # Логотипы
```

## Remote media

Приложение умеет подмешивать удалённые медиа-ассеты через `config.json` -> `mediaSources.remote`.

Если `mediaSources.remote.enabled = true`, библиотека медиа работает в `remote-only` режиме для `assets`, `logo` и `font`.
Командные дефолты лучше хранить в `config.json -> defaultValues`, а `localStorage` использовать только как персональный override в браузере конкретного пользователя.
Для нескольких команд можно использовать `config.json -> teamProfiles` и выбирать профиль через `?team=<id>` в URL.

Важно: приватный бакет `ai-craft-media` нельзя читать напрямую из браузера по обычным bucket URL. Для remote media нужен `manifestUrl`, который отдаёт JSON-манифест с уже доступными URL файлов, например presigned URL или ссылки через backend.

Пример структуры remote manifest:

```json
{
  "assets": {
    "pro": {
      "assets": [
        {
          "name": "Remote 01",
          "file": "https://example.com/presigned/pro/assets/1.webp"
        }
      ]
    },
    "3d": {
      "bg": [
        {
          "name": "triangle green dark",
          "file": "https://example.com/presigned/3d/bg/shape=triangle, inside=green, theme=dark.webp"
        }
      ]
    }
  }
}
```

Референс backend-реализации для `manifest` и `presigned upload` лежит в [serverless/media-api](/Users/vidmich/Desktop/prac/serverless/media-api).

На фронте уже есть базовый клиент для presigned uploads: [remoteMediaApi.js](/Users/vidmich/Desktop/prac/src/utils/remoteMediaApi.js).

Для production-подключения remote media можно взять шаблон [config.remote-media.example.json](/Users/vidmich/Desktop/prac/config.remote-media.example.json).

### Профили команд

Один и тот же хост можно использовать для нескольких команд:

```json
{
  "defaultTeam": "academy",
  "teamProfiles": {
    "academy": {
      "brandName": "Практикума",
      "defaultValues": {
        "defaultLogoRU": "logo/white/ru/main.svg",
        "kvSelected": "assets/pro/assets/1.webp",
        "fontFamily": "YS Text"
      }
    },
    "fintech": {
      "brandName": "Fintech Team",
      "defaultValues": {
        "defaultLogoRU": "logo/black/ru/main.svg",
        "kvSelected": "assets/3d/logos/40.webp",
        "fontFamily": "YS Display"
      }
    }
  }
}
```

Профиль открывается так:

- `/` — берёт `defaultTeam`
- `/?team=academy`
- `/?team=fintech`

Базовый `config.json` задаёт общие настройки, а профиль команды переопределяет только свои поля.

### Workspace API

Для многокомандной работы поверх генератора можно подключить backend `serverless/workspace-api`.

Пример секции в `config.json`:

```json
{
  "workspaceApi": {
    "enabled": true,
    "baseUrl": "https://example.com/api"
  }
}
```

Что появится во фронте:

- логин пользователя внутри команды
- список проектов команды
- создание и архивирование проекта
- сохранение текущего состояния проекта
- сохранение состояния как шаблона для возврата позже

Если `workspaceApi.baseUrl` не указан, фронт будет пытаться ходить в API по тому же origin, где открыт сайт.
