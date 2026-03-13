# Yandex Cloud: стартовая production-настройка для AI-Craft

Этот документ описывает самый первый практический этап вывода проекта в production как `static-first` сервиса.

Репозиторий:
- `index.html`
- ES modules из `src/`
- `sw.js`
- локальные ассеты из `assets/`, `font/`, `logo/`

## Что делаем на первом этапе

Цель этапа:
- раздать приложение как статический сайт из Yandex Object Storage
- ускорить доставку через Cloud CDN
- подключить домен и TLS
- не сломать обновления из-за `service worker` и тяжёлого кэша

## Минимальный стек Yandex Cloud

Обязательные сервисы:
- Billing
- Cloud and Folder
- Object Storage
- IAM
- Cloud DNS
- Certificate Manager
- Cloud CDN

Опционально, но полезно:
- Lockbox для хранения секретов CI/CD
- Monitoring

## Практический порядок настройки

1. Включить биллинг и создать отдельную папку, например `ai-craft-prod`.
2. Создать бакет Object Storage:
   - имя `ai-craft`
   - регион `ru-central1`
3. Включить static website hosting:
   - index document: `index.html`
   - error document: `index.html`
4. Включить публичное чтение объектов.
5. Настроить CORS для безопасного чтения ассетов.
6. Создать service account для деплоя.
7. Создать static access key для этого service account.
8. Настроить Cloud CDN поверх Object Storage.
9. Выпустить TLS-сертификат в Certificate Manager.
10. Подключить домен через Cloud DNS.
11. После этого запускать деплой из этого репозитория через `deploy.sh`.

## Настройки бакета

Обязательные:
- Public read для объектов
- Static website hosting
- `index.html` как index document

Рекомендуемые:
- error document тоже `index.html`
- CORS на `GET, HEAD, OPTIONS`

Файлы-шаблоны для Object Storage:
- website config: можно использовать содержимое из `deploy.sh`
- CORS config: можно использовать содержимое из `deploy.sh`

## Настройки кэширования для этого проекта

Для этого репозитория правила должны быть такими:

- `index.html`
  - `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`
- `styles.css`, `src/*.js`, `sizes-config.json`
  - `Cache-Control: public, max-age=31536000, immutable`
- картинки, шрифты, логотипы
  - `Cache-Control: public, max-age=31536000, immutable`

Почему так:
- входная HTML-страница должна быстро обновляться
- ассеты уже подключаются с `?v=APP_VERSION`
- это безопасно для CDN и браузерного кэша

## Особенности именно этого проекта

У проекта есть `service worker` в `sw.js`, поэтому:

- нельзя кэшировать `index.html` как immutable
- нельзя забывать обновлять версию приложения при релизе
- нужно следить, чтобы `APP_VERSION` в `index.html` и `CACHE_VERSION` в `sw.js` совпадали

Сейчас в проекте versioning уже есть, но его надо держать дисциплинированно при каждом релизе.

## Что уже подготовлено в репозитории

В этом репозитории уже есть:
- [deploy.sh](/Users/vidmich/Desktop/prac/deploy.sh)
- [DEPLOY.md](/Users/vidmich/Desktop/prac/DEPLOY.md)
- [sw.js](/Users/vidmich/Desktop/prac/sw.js)
- versioned asset references в [index.html](/Users/vidmich/Desktop/prac/index.html)

Также в `deploy.sh` уже настроены корректные production cache headers под static-first схему:
- HTML не кэшируется агрессивно
- versioned JS/CSS/JSON кэшируются долго
- ассеты и шрифты кэшируются долго

## Что делать дальше после базового запуска

Сразу после первого успешного production-деплоя я рекомендую делать следующий шаг:

1. Вынести версию приложения в единый источник правды.
2. Подготовить CI/CD деплой в Object Storage.
3. Затем добавить удалённое хранение загружаемых медиа через Object Storage + presigned URLs.

## Риски, про которые важно помнить

- Если `index.html` закэшируется слишком агрессивно, пользователи будут видеть старую версию.
- Если забыть обновить `CACHE_VERSION`, `service worker` может держать старые файлы.
- Если открыть upload напрямую в публичный бакет без presigned URL, это небезопасно.
- Если CDN будет кэшировать HTML слишком долго, релизы станут “залипать”.

## Рекомендуемый следующий практический шаг

Следующим шагом стоит:
- синхронизировать `APP_VERSION` и `CACHE_VERSION` автоматически
- затем подготовить CI deploy workflow для Yandex Object Storage
