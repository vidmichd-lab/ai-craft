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

## Версия релиза

Версия приложения хранится в `window.APP_VERSION` внутри [index.html](/Users/vidmich/Desktop/prac/index.html) и используется для versioned assets и service worker.

Поднять версию можно одной командой:

```bash
node scripts/bump-version.mjs patch
```

Другие варианты:

```bash
node scripts/bump-version.mjs minor
node scripts/bump-version.mjs major
node scripts/bump-version.mjs 1.2.3
node scripts/bump-version.mjs --current
```

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
