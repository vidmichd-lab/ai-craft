# Figma Code Connect

Этот репозиторий подготовлен для работы с Figma Code Connect на `apps/web`.

## Что уже настроено

- локальная CLI-зависимость `@figma/code-connect` в `@ai-craft/web`;
- конфиг [apps/web/figma.config.json](/Users/vidmich/Desktop/prac/apps/web/figma.config.json) с `parser: "react"` и поддержкой наших TypeScript aliases;
- папка [apps/web/src/figma](/Users/vidmich/Desktop/prac/apps/web/src/figma) для generated `*.figma.tsx`;
- команды из корня монорепы и из самого `apps/web`.

## Что нужно от Figma

1. Personal access token с правами:
   - `Code Connect: Write`
   - `File content: Read`
2. Ссылка на Figma-файл библиотеки, где лежат root components, а не только instances.

## Команды

Из корня репозитория:

```bash
export FIGMA_ACCESS_TOKEN="<your-figma-pat>"
npm run figma:web:connect
npm run figma:web:publish
```

Либо из `apps/web`:

```bash
cd /Users/vidmich/Desktop/prac/apps/web
export FIGMA_ACCESS_TOKEN="<your-figma-pat>"
npm run figma:connect
npm run figma:publish
```

## Как пройти interactive setup

1. Запустите `npm run figma:web:connect`.
2. На шаге `top-level directory` укажите `./src/components`.
3. На шаге `Figma file URL` вставьте URL вашей дизайн-библиотеки.
4. Когда мастер спросит про `figma.config.json`, оставьте существующий файл.
5. На шаге выбора output directory укажите `./src/figma`.
6. Проверьте предложенные связи между Figma components и code components.
7. Подтвердите создание файлов.

После этого в `apps/web/src/figma` появятся `*.figma.tsx`, а для публикации в Dev Mode нужно выполнить `npm run figma:web:publish`.

## Что делать дальше

- проверить и при необходимости вручную донастроить `props` mapping в generated `*.figma.tsx`;
- для базовых UI-примитивов постепенно вынести устойчивые компоненты в `packages/ui`, если захотим сделать библиотеку переиспользуемой вне `apps/web`;
- если будет отдельная staging/design-library копия, можно добавить `interactiveSetupFigmaFileUrl` или `documentUrlSubstitutions` в [apps/web/figma.config.json](/Users/vidmich/Desktop/prac/apps/web/figma.config.json).
