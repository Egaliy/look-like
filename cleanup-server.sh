#!/bin/bash
# Скрипт для удаления приложения с сервера
# Выполнить на сервере или через SSH: ssh root@130.49.149.162 'bash -s' < cleanup-server.sh

set -e

echo "🗑️ Удаление приложения с сервера..."

# Остановить и удалить PM2 процесс
echo "Остановка PM2 процесса..."
pm2 delete look-like 2>/dev/null || pm2 stop look-like 2>/dev/null || echo "PM2 процесс 'look-like' не найден"
pm2 delete like-that 2>/dev/null || pm2 stop like-that 2>/dev/null || echo "PM2 процесс 'like-that' не найден"
pm2 save 2>/dev/null || true

# Удалить папки проекта
PROJECT_PATHS=(
  "/var/www/look-like"
  "/var/www/like-that"
  "/var/www/like-this"
)

for path in "${PROJECT_PATHS[@]}"; do
  if [ -d "$path" ]; then
    echo "Удаление папки: $path"
    rm -rf "$path"
    echo "✅ Удалено: $path"
  else
    echo "Папка не найдена: $path"
  fi
done

# Очистить PM2 если нужно
if [ -f ~/.pm2/dump.pm2 ]; then
  echo "Очистка PM2..."
  pm2 kill 2>/dev/null || true
  rm -f ~/.pm2/dump.pm2 2>/dev/null || true
fi

echo ""
echo "✅ Очистка завершена. Приложение удалено с сервера."
