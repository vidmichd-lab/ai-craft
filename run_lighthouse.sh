#!/bin/bash
# Скрипт для запуска Lighthouse audit

echo "🔍 Запуск Lighthouse audit..."
echo ""

# Проверяем, установлен ли lighthouse
if ! command -v lighthouse &> /dev/null; then
    echo "❌ Lighthouse не установлен."
    echo ""
    echo "Установите Lighthouse через npm:"
    echo "  npm install -g lighthouse"
    echo ""
    echo "Или используйте встроенный Lighthouse в Chrome DevTools:"
    echo "  1. Откройте http://localhost:8000 в Chrome"
    echo "  2. Нажмите F12 (DevTools)"
    echo "  3. Перейдите на вкладку 'Lighthouse'"
    echo "  4. Выберите категории (Performance, Accessibility, Best Practices, SEO)"
    echo "  5. Нажмите 'Analyze page load'"
    exit 1
fi

# URL для аудита
URL="http://localhost:8000"

# Проверяем, запущен ли сервер
if ! curl -s "$URL" > /dev/null 2>&1; then
    echo "⚠️  Сервер не отвечает на $URL"
    echo "Запустите сервер: python3 start_server.py"
    exit 1
fi

echo "✅ Сервер доступен на $URL"
echo ""
echo "Запускаю Lighthouse audit..."
echo ""

# Запускаем Lighthouse с выводом в консоль и HTML отчет
lighthouse "$URL" \
    --output=html,json \
    --output-path=./lighthouse-report \
    --chrome-flags="--headless" \
    --only-categories=performance,accessibility,best-practices,seo

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Audit завершен!"
    echo ""
    echo "📊 Отчеты сохранены:"
    echo "  - HTML: lighthouse-report.html"
    echo "  - JSON: lighthouse-report.json"
    echo ""
    echo "Откройте lighthouse-report.html в браузере для просмотра результатов"
else
    echo ""
    echo "❌ Ошибка при запуске Lighthouse"
    exit 1
fi

