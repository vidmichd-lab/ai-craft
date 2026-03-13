# Workspace API

Serverless backend для многокомандного режима AI-Craft в Yandex Cloud.

## Что уже есть

- авторизация пользователей внутри команды
- сессионная cookie + JWT payload
- изоляция данных по `teamId`
- роли `editor`, `lead`, `admin` (`admin` только для email из `WORKSPACE_SUPERADMIN_EMAILS`)
- CRUD-операции для проектов
- сохранение snapshots и templates
- чтение и сохранение `team defaults`

## Режимы storage

### `memory`

Режим по умолчанию для локальной разработки и быстрой интеграции с фронтом.

При старте автоматически создаются:

- одна команда `Яндекс Практикум` из `WORKSPACE_BOOTSTRAP_TEAM_*`
- один bootstrap-пользователь из `WORKSPACE_BOOTSTRAP_ADMIN_*`, если заданы email и пароль
- первая версия `team defaults`

### `ydb`

Production-режим для Yandex Cloud YDB. В `index.mjs` уже есть рабочий query layer для:

- login через `users + memberships + teams`
- sessions
- projects
- project snapshots/templates
- team defaults

## Сущности

См. [schema.yql](/Users/vidmich/Desktop/prac/serverless/workspace-api/schema.yql).

- `teams`
- `users`
- `memberships`
- `projects`
- `project_snapshots`
- `team_defaults`
- `sessions`

## API

- `GET /workspace/health`
- `GET /teams/public`
- `GET /admin/teams`
- `GET /admin/users?teamId=<id>`
- `POST /admin/users`
- `POST /admin/users/role`
- `POST /admin/users/reset-password`
- `POST /admin/users/remove`
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /teams/current`
- `GET /team-defaults`
- `POST /team-defaults`
- `GET /projects`
- `POST /projects`
- `POST /projects/update`
- `POST /projects/archive`
- `GET /snapshots?projectId=<id>&kind=snapshot|template`
- `POST /snapshots`

## Базовый сценарий

1. `GET /teams/public` для стартового экрана
2. `POST /auth/login` или `POST /auth/register`
3. `GET /teams/current`
4. `GET /projects`
5. `POST /projects` при создании проекта
6. `POST /projects/update` при переименовании и сохранении текущего `state`
7. `POST /snapshots` с `kind=template`, если пользователь нажал "Сохранить как шаблон"

## Пример login

```bash
curl -i \
  -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "change-me-now",
    "teamSlug": "practicum"
  }'
```

## Env

См. [.env.example](/Users/vidmich/Desktop/prac/serverless/workspace-api/.env.example).

Ключевые переменные:

- `WORKSPACE_STORAGE=memory|ydb`
- `WORKSPACE_JWT_SECRET`
- `WORKSPACE_ALLOWED_ORIGINS`
- `WORKSPACE_COOKIE_SAME_SITE`
- `WORKSPACE_SUPERADMIN_EMAILS`
- `WORKSPACE_BOOTSTRAP_TEAM_SLUG`
- `WORKSPACE_BOOTSTRAP_TEAM_NAME`
- `WORKSPACE_BOOTSTRAP_ADMIN_EMAIL`
- `WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD`
- `WORKSPACE_BOOTSTRAP_DEFAULTS_JSON`
- `WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON`
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- `YDB_AUTH_TOKEN` for local scripts like `apply-schema`, `seed`, `smoke`

## Deploy в Yandex Cloud

```bash
cd /Users/vidmich/Desktop/prac/serverless/workspace-api
export YC_FOLDER_ID=<folder-id>
export WORKSPACE_STORAGE=ydb
export WORKSPACE_JWT_SECRET=<long-random-secret>
export YDB_ENDPOINT=grpcs://ydb.serverless.yandexcloud.net:2135
export YDB_DATABASE=/ru-central1/<folder-id>/<database-id>
export SERVICE_ACCOUNT_ID=<workspace-runtime-sa-id>
./deploy.sh
```

В production функция должна ходить в YDB через attached service account. `YDB_AUTH_TOKEN` не нужно прокидывать в env функции.
Если frontend живет на другом домене, чем API Gateway, задайте `WORKSPACE_COOKIE_SAME_SITE=none` и оставьте `WORKSPACE_COOKIE_SECURE=true`.

## RBAC

- `admin` доступен только email из `WORKSPACE_SUPERADMIN_EMAILS`
- `lead` меняет defaults и режимы макетов только внутри своей команды
- `editor` работает с проектами и шаблонами, но не меняет team defaults
- superadmin управляет командами, пользователями, ролями и сбросом паролей

## Bootstrap YDB

После применения [schema.yql](/Users/vidmich/Desktop/prac/serverless/workspace-api/schema.yql) можно создать первую команду и, при необходимости, bootstrap-пользователя:

```bash
cd /Users/vidmich/Desktop/prac/serverless/workspace-api
export WORKSPACE_STORAGE=ydb
export YDB_ENDPOINT=grpcs://ydb.serverless.yandexcloud.net:2135
export YDB_DATABASE=/ru-central1/<folder-id>/<database-id>
export YDB_AUTH_TOKEN=<iam-or-sa-token>
export WORKSPACE_BOOTSTRAP_TEAM_SLUG=practicum
export WORKSPACE_BOOTSTRAP_TEAM_NAME="Яндекс Практикум"
export WORKSPACE_SUPERADMIN_EMAILS=vidmichd@ya.ru
export WORKSPACE_BOOTSTRAP_ADMIN_EMAIL=vidmichd@ya.ru
export WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD=<strong-random-password>
npm run seed
```

Если хотите зарегистрировать superadmin позже вручную, просто не задавайте `WORKSPACE_BOOTSTRAP_ADMIN_EMAIL` и `WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD`.

## Smoke

Быстрая проверка backend-сценария `health -> login -> create project -> save template`:

```bash
cd /Users/vidmich/Desktop/prac/serverless/workspace-api
export WORKSPACE_STORAGE=ydb
export YDB_ENDPOINT=grpcs://ydb.serverless.yandexcloud.net:2135
export YDB_DATABASE=/ru-central1/<folder-id>/<database-id>
export YDB_AUTH_TOKEN=<iam-or-sa-token>
export WORKSPACE_BOOTSTRAP_TEAM_SLUG=practicum
export WORKSPACE_SUPERADMIN_EMAILS=vidmichd@ya.ru
export WORKSPACE_SMOKE_EMAIL=vidmichd@ya.ru
export WORKSPACE_SMOKE_PASSWORD=<strong-random-password>
npm run smoke
```

## Что осталось до production

1. Применить `schema.yql` в живой YDB
2. Выполнить `npm run seed`
3. Прогнать `npm run smoke`
4. Добавить audit trail, refresh token rotation и сброс пароля
