#!/bin/bash
# Запускать НА СЕРВЕРЕ (консоль в панели хостинга или по SSH).
# Один раз: cd /var/www/like-that && sudo bash scripts/server-bootstrap.sh
# Поднимает сайт, настраивает PM2 и сторож.

set -e

PROJECT_DIR="${PROJECT_DIR:-/var/www/like-that}"
cd "$PROJECT_DIR"

echo "=== Bootstrap: $PROJECT_DIR ==="

if [[ ! -f .env ]]; then
  echo "Создай .env с DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET и снова запусти этот скрипт."
  exit 1
fi

echo "Установка зависимостей..."
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund

echo "Prisma..."
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true

echo "Сборка..."
npm run build

echo "PM2..."
pm2 delete like-that 2>/dev/null || true
pm2 start npm --name like-that -- start
pm2 save

echo "Автозапуск после перезагрузки..."
STARTUP_CMD=$(pm2 startup 2>/dev/null | grep -o 'sudo.*' | head -1)
[[ -n "$STARTUP_CMD" ]] && eval "$STARTUP_CMD" 2>/dev/null || true
pm2 save

echo "Сторож (перезапуск при падении)..."
W="$PROJECT_DIR/scripts/server-watchdog.sh"
[[ -f "$W" ]] && chmod +x "$W"
if [[ -f "$W" ]] && ! crontab -l 2>/dev/null | grep -q "server-watchdog.sh"; then
  (crontab -l 2>/dev/null; echo "*/5 * * * * $W >> /var/log/like-that-watchdog.log 2>&1") | crontab -
fi

echo "=== Готово. Сайт должен открываться. ==="
