#!/bin/bash
# Один скрипт деплоя на сервере с логом каждого шага.
# Запуск в консоли сервера: curl -sL ... | bash   ИЛИ   cd /var/www/like-that && bash scripts/deploy-on-server-with-log.sh
# Лог: /tmp/like-that-deploy.log — по нему видно, на каком шаге упало.

set -e

PROJ="${PROJECT_DIR:-/var/www/like-that}"
REPO_URL="https://github.com/Egaliy/look-like.git"
LOG="/tmp/like-that-deploy.log"
APP_PORT="${APP_PORT:-3002}"
APP_URL="http://130.49.149.162:${APP_PORT}"

echo "=== Деплой Like That ===" | tee "$LOG"
echo "Лог: $LOG" | tee -a "$LOG"

# 0. Node (Next 14 нужен Node 18+)
NODE_V=$(node -v 2>/dev/null | sed 's/v//;s/\..*//') || NODE_V=0
if [ "${NODE_V:-0}" -lt 18 ]; then
  echo "Ошибка: нужен Node 18+. Сейчас: $(node -v 2>/dev/null || echo 'node не найден')" | tee -a "$LOG"
  echo "Установи: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs" | tee -a "$LOG"
  exit 1
fi
echo "Node: $(node -v)" | tee -a "$LOG"
echo "Свободно RAM (MB): $(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo '?')" | tee -a "$LOG"

# 1. Папка и репо
mkdir -p /var/www
if [ -d "$PROJ/.git" ]; then
  echo ">>> Обновление репо..." | tee -a "$LOG"
  (cd "$PROJ" && git fetch origin && git reset --hard origin/main) >> "$LOG" 2>&1 || {
    echo "FAIL git (fetch/reset) — репо приватный? Настрой токен или SSH" | tee -a "$LOG"
    echo "--- Последние строки лога ---" && tail -30 "$LOG"
    exit 1
  }
  cd "$PROJ"
else
  echo ">>> Клонирование..." | tee -a "$LOG"
  rm -rf "$PROJ"
  git clone "$REPO_URL" "$PROJ" >> "$LOG" 2>&1 || {
    echo "FAIL clone — смотри конец $LOG" | tee -a "$LOG"
    echo "Если репо приватный: git clone https://TOKEN@github.com/Egaliy/look-like.git $PROJ" | tee -a "$LOG"
    echo "--- Последние строки лога ---" && tail -30 "$LOG"
    exit 1
  }
  cd "$PROJ"
fi

# 2. .env
if [ ! -f .env ]; then
  echo ">>> Создание .env" | tee -a "$LOG"
  if [ -f .env.example ]; then
    cp .env.example .env
    (grep -v '^NEXTAUTH_URL=' .env; echo "NEXTAUTH_URL=$APP_URL") > .env.tmp && mv .env.tmp .env
  else
    echo 'DATABASE_URL="postgresql://localhost:5432/like_that?pgbouncer=true"' > .env
    echo "NEXTAUTH_URL=$APP_URL" >> .env
    echo 'NEXTAUTH_SECRET=change-me' >> .env
  fi
  echo "    Замени DATABASE_URL в .env на свою строку из Supabase" | tee -a "$LOG"
fi
# Всегда выставляем NEXTAUTH_URL на порт 3002
(grep -v '^NEXTAUTH_URL=' .env 2>/dev/null; echo "NEXTAUTH_URL=$APP_URL") > .env.tmp && mv .env.tmp .env

# 3. Зависимости
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"
echo ">>> npm install" | tee -a "$LOG"
npm ci --production=false >> "$LOG" 2>&1 || npm install --production=false >> "$LOG" 2>&1 || {
    echo "FAIL npm" | tee -a "$LOG"
    echo "--- Последние строки лога ---" && tail -40 "$LOG"
    exit 1
  }

# 4. Prisma
echo ">>> prisma generate" | tee -a "$LOG"
npx prisma generate >> "$LOG" 2>&1 || {
    echo "FAIL prisma generate" | tee -a "$LOG"
    echo "--- Последние строки лога ---" && tail -40 "$LOG"
    exit 1
  }
echo ">>> prisma db (migrate или push)" | tee -a "$LOG"
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true

# 5. Сборка (лимит 512MB — на 1GB RAM без этого падает с out of memory)
echo ">>> npm run build (NODE_OPTIONS=--max-old-space-size=512)" | tee -a "$LOG"
(NODE_OPTIONS=--max-old-space-size=512 npm run build) >> "$LOG" 2>&1 || {
    echo "FAIL build — смотри конец $LOG" | tee -a "$LOG"
    echo "--- Последние строки лога (часто тут причина) ---" && tail -50 "$LOG"
    exit 1
  }

# 6. PM2 (порт 3002)
echo ">>> pm2 (PORT=$APP_PORT)" | tee -a "$LOG"
pm2 delete like-that 2>/dev/null || true
PORT=$APP_PORT pm2 start npm --name like-that -- start >> "$LOG" 2>&1 || {
    echo "FAIL pm2" | tee -a "$LOG"
    echo "--- Последние строки лога ---" && tail -30 "$LOG"
    exit 1
  }
pm2 save 2>/dev/null || true

echo "=== Готово ===" | tee -a "$LOG"
echo "Сайт: $APP_URL" | tee -a "$LOG"
echo "Проверка: curl -s http://127.0.0.1:$APP_PORT/api/ping" | tee -a "$LOG"
sleep 2
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT/api/ping" | tee -a "$LOG" || true
echo "" | tee -a "$LOG"
echo "Полный лог: $LOG"
