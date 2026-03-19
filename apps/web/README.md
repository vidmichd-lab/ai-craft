# AI-Craft Web

Новый Next.js-контур для постепенной миграции UI и server-facing логики из текущего статического приложения.

## Зачем

- перевести сложный UI в компонентную архитектуру;
- вынести server-side код в более профессиональную структуру;
- мигрировать без остановки текущего продакшена.

## Команды

```bash
cd /Users/vidmich/Desktop/prac/apps/web
npm install
npm run dev
```

## Первые принципы архитектуры

- `src/app` — маршруты и layout на App Router.
- `src/components` — изолированные UI-компоненты.
- `src/server` — server-only env, domain logic, clients, auth helpers.
- `src/app/api` — тонкие HTTP handlers, если нужен BFF-слой.

## Что переносить первым

1. Экран входа и auth flow.
2. Пользовательские настройки.
3. Настройки команды, отделы и права.
4. Галерея шаблонов и медиа.
5. Сам редактор и preview/export pipeline.
