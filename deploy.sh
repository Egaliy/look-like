#!/bin/bash

# Скрипт для деплоя на сервер
# Запустите этот скрипт на сервере 130.49.149.162

set -e

PROJECT_PATH="/var/www/like-that"
REPO_URL="https://github.com/Egaliy/look-like.git"

echo "🚀 Начало деплоя..."

# Определяем путь к проекту
if [ ! -d "$PROJECT_PATH" ]; then
    echo "📁 Проект не найден в $PROJECT_PATH, клонируем..."
    mkdir -p $(dirname "$PROJECT_PATH")
    git clone "$REPO_URL" "$PROJECT_PATH"
    cd "$PROJECT_PATH"
else
    echo "📁 Переходим в директорию проекта..."
    cd "$PROJECT_PATH"
    echo "📦 Обновляем код из репозитория..."
    git pull origin main
fi

echo "📥 Устанавливаем зависимости..."
npm ci --production=false

echo "🔧 Генерируем Prisma клиент..."
npx prisma generate

echo "🗄️ Применяем миграции базы данных..."
npx prisma migrate deploy || npx prisma db push || true

echo "🏗️ Собираем приложение..."
npm run build

echo "🔄 Перезапускаем приложение через PM2..."
if pm2 list | grep -q "like-that"; then
    pm2 restart like-that
else
    pm2 start npm --name "like-that" -- start
    pm2 save
fi

echo "✅ Деплой завершен успешно!"
