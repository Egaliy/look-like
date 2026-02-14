#!/bin/bash
# Запускать НА СЕРВЕРЕ (консоль в панели хостинга или по SSH).
# Один раз: cd /var/www/like-that && sudo bash scripts/server-bootstrap.sh
# Поднимает сайт, настраивает PM2 и сторож.

set -e

PROJECT_DIR="${PROJECT_DIR:-/var/www/like-that}"
cd "$PROJECT_DIR"

echo "=== Bootstrap: $PROJECT_DIR ==="

# .env: если нет — создаём из примера (подставь свой DATABASE_URL потом)
if [[ ! -f .env ]]; then
  echo "Создаю .env из .env.example (потом замени DATABASE_URL на свой Supabase)."
  cp .env.example .env 2>/dev/null || true
  if [[ ! -f .env ]]; then
    echo "DATABASE_URL=postgresql://localhost:5432/like_that?pgbouncer=true" > .env
    echo "NEXTAUTH_URL=http://130.49.149.162:3002" >> .env
    echo "NEXTAUTH_SECRET=change-me-$(date +%s)" >> .env
  fi
  sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://130.49.149.162:3002|' .env 2>/dev/null || true
fi

echo "Установка зависимостей..."
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund

echo "Prisma..."
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true

echo "Сборка (с лимитом памяти 512MB для серверов с 1GB RAM)..."
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"
npm run build:server 2>/dev/null || npm run build

echo "PM2..."
pm2 delete like-that 2>/dev/null || true
PORT=3002 pm2 start npm --name like-that -- start
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
