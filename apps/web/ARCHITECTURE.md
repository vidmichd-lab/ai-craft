# Next.js Migration Architecture

## Goal

Перевести AI-Craft из большого vanilla UI и разрозненных serverless handler'ов в более профессиональную, поддерживаемую архитектуру:

- `Next.js` как основной web shell и BFF-слой;
- строгая модульная серверная логика;
- поэтапная миграция без остановки текущего продукта.

## Recommended target shape

### 1. Frontend

- `src/app` — маршруты, layout, серверные страницы и client boundaries.
- `src/components` — UI-компоненты, сгруппированные по доменам.
- `src/features` — feature slices: `auth`, `workspace`, `teams`, `departments`, `templates`, `media`.
- `src/lib` — общие клиенты, formatters, typed DTO helpers.

### 2. Server layer inside Next

- `src/server/env.ts` — валидация env через `zod`.
- `src/server/auth/*` — сессии, cookie policy, role checks.
- `src/server/db/*` — YDB adapters/repositories.
- `src/server/services/*` — бизнес-логика.
- `src/server/policies/*` — access-control, ownership, team/department rules.
- `src/server/http/*` — ошибки, response mappers, audit logging.

### 3. API style

Тонкие route handlers:

- только parse/authorize/delegate/respond;
- без бизнес-логики внутри `route.ts`;
- все payload'ы валидируются схемами;
- все ошибки проходят через единый mapper.

### 4. Data boundaries

Разделить модели:

- `User`
- `Team`
- `Department`
- `Membership`
- `Template`
- `Snapshot`
- `MediaAsset`
- `TeamDefaults`
- `DepartmentOverrides`

Не держать “все в одном giant object state”, как сейчас в workspace panel.

## Why not keep all backend logic in current serverless files

Текущий `serverless/workspace-api/index.mjs` уже слишком крупный для долгой жизни. Для профессионального сервера лучше:

1. разрезать по доменам;
2. вынести репозитории и сервисы;
3. централизовать auth/ACL;
4. избавиться от ad-hoc branching по ролям в одном файле.

## Migration stages

### Stage 1

- поднять `Next.js` shell;
- перенести login screen;
- сделать `/api/health`;
- ввести typed env и server modules.

### Stage 2

- перенести auth/session flow;
- сделать BFF endpoints для login/logout/me;
- спрятать прямые frontend calls к legacy API за server client layer.

### Stage 3

- перенести user settings и team settings;
- собрать команды/отделы/роли в нормальные server services;
- внедрить policy checks на уровне server layer.

### Stage 4

- перенести шаблоны и медиа;
- унифицировать ACL для media mutations;
- убрать опасные прямые мутации из старых serverless endpoints.

### Stage 5

- перенести editor shell;
- оставить renderer/export как отдельный domain module;
- после стабилизации выключить legacy static app.

## Server quality bar

Чтобы сервер был “максимально профессиональным”, предлагаю держать такие правила:

1. Строгая валидация входа и env.
2. Тонкие handlers, толстые services.
3. Repository pattern для YDB.
4. Единый audit log для admin/team mutations.
5. Единая policy layer для roles and scopes.
6. Никаких fallback secrets и debug behavior в production.
7. Никаких frontend-only проверок на критичных действиях.
8. Интеграционные тесты на auth, roles, departments, templates, media.
