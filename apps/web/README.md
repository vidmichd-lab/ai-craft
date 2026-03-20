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

### Figma Code Connect

Code Connect настроен для `apps/web`, чтобы привязывать React-компоненты из `src/components` к вашей Figma design library и видеть код прямо в Dev Mode.

```bash
cd /Users/vidmich/Desktop/prac
export FIGMA_ACCESS_TOKEN="<your-figma-pat>"
npm run figma:web:connect
```

Во время interactive setup используйте:

- top-level directory: `./src/components`
- Figma file URL: ссылку на файл библиотеки с root components
- output directory: `./src/figma`

После генерации файлов опубликуйте их:

```bash
cd /Users/vidmich/Desktop/prac
export FIGMA_ACCESS_TOKEN="<your-figma-pat>"
npm run figma:web:publish
```

Подробный runbook лежит в [../../docs/figma-code-connect.md](../../docs/figma-code-connect.md).

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
