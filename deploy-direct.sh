#!/bin/bash
# Деплой на VPS в обход GitHub: rsync + сборка на сервере.
# Использование: ./deploy-direct.sh
# Один раз настрой переменные ниже и создай .env на сервере.

set -e

# === Настрой под свой сервер ===
VPS_HOST="${VPS_HOST:-130.49.149.162}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/var/www/like-that}"

# Папка проекта (где лежит этот скрипт)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📤 Деплой на $VPS_USER@$VPS_HOST:$VPS_PATH"
echo ""

export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ServerAliveInterval=10"

# Проверка доступа по SSH
if ! ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -o BatchMode=yes "$VPS_USER@$VPS_HOST" "exit" 2>/dev/null; then
  echo "❌ По SSH до сервера достучаться нельзя (таймаут или порт 22 закрыт)."
  echo ""
  echo "Команду ниже выполняй В КОНСОЛИ СЕРВЕРА (в панели хостинга: «Открыть консоль» / VNC для этой VPS), НЕ на своём Mac:"
  echo ""
  echo "  cd /var/www/like-that && sudo bash scripts/server-bootstrap.sh"
  echo ""
  echo "Если папки /var/www/like-that нет на сервере — открой порт 22 в фаерволле и с Mac запусти: npm run deploy:full"
  exit 1
fi

# 0. Создаём каталог на сервере, если его нет
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH" 2>/dev/null || true

# 1. Копируем локальный .env на сервер (если есть), подставляем NEXTAUTH_URL для сервера
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  echo "📄 Копирую .env на сервер..."
  scp -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$SCRIPT_DIR/.env" "$VPS_USER@$VPS_HOST:$VPS_PATH/.env"
  NEXTAUTH_VALUE="http://$VPS_HOST"
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && (grep -v '^NEXTAUTH_URL=' .env 2>/dev/null; echo \"NEXTAUTH_URL=$NEXTAUTH_VALUE\") > .env.tmp && mv .env.tmp .env"
  echo ""
fi

# 2. Загрузка файлов (без node_modules, .next, .git; .env уже на сервере)
echo "📦 Загрузка файлов..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  ./ "$VPS_USER@$VPS_HOST:$VPS_PATH/"

# 3. Сборка и перезапуск на сервере (по шагам, чтобы видеть прогресс)
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=10"
echo ""
run_remote() { ssh $SSH_OPTS "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && $1"; }

echo "🏗️ Проверка .env..."
run_remote "[ -f .env ] || (echo '❌ Нет .env на сервере'; exit 1)"

echo "📦 npm ci..."
run_remote "npm ci"

echo "🔧 prisma generate..."
run_remote "npx prisma generate"

echo "🗄️ prisma db..."
run_remote "npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true"

echo "🏗️ npm run build (лимит памяти 512MB, может занять 2–5 мин)..."
run_remote "export NODE_OPTIONS=--max-old-space-size=512 && (npm run build:server 2>/dev/null || npm run build)"

echo "🔄 pm2..."
run_remote "pm2 restart like-that 2>/dev/null || PORT=3002 pm2 start npm --name like-that -- start"

echo "✅ Готово"

echo ""
echo "🌐 Сайт: http://$VPS_HOST"
echo "   Админка: http://$VPS_HOST/admin"
echo ""
echo "Если по IP ещё открывается другой сайт — на сервере включи nginx для like-that:"
echo "  ssh $VPS_USER@$VPS_HOST 'sudo cp $VPS_PATH/scripts/nginx-like-that.conf /etc/nginx/sites-available/like-that && sudo ln -sf /etc/nginx/sites-available/like-that /etc/nginx/sites-enabled/0-like-that && sudo nginx -t && sudo systemctl reload nginx'"