#!/bin/bash
# Запускать НА СЕРВЕРЕ (панель хостинга → Открыть консоль или SSH).
# Полный деплой с нуля: клон репо, сборка, PM2.
# Затем вручную добавь nginx (см. комментарий в конце).

set -e

VPS_PATH="/var/www/like-that"
REPO_URL="https://github.com/Egaliy/look-like.git"

echo "=== Деплой Like That на сервер ==="

# 1. Папка и репозиторий
mkdir -p /var/www
if [ -d "$VPS_PATH/.git" ]; then
  echo "Обновление репозитория..."
  cd "$VPS_PATH"
  git fetch origin
  git reset --hard origin/main
else
  echo "Клонирование репозитория..."
  rm -rf "$VPS_PATH"
  git clone "$REPO_URL" "$VPS_PATH"
  cd "$VPS_PATH"
fi

# 2. .env
if [ ! -f .env ]; then
  echo "Создаю .env (заглушка). Потом замени DATABASE_URL на свой из Supabase."
  cat > .env << 'ENVFILE'
DATABASE_URL="postgresql://user:password@localhost:5432/like_that?pgbouncer=true"
NEXTAUTH_URL="http://130.49.149.162"
NEXTAUTH_SECRET="change-me-please"
ENVFILE
fi

# 3. Сборка
echo "Установка зависимостей..."
npm ci --production=false
echo "Prisma..."
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || true
echo "Сборка Next.js..."
npm run build

# 4. PM2
echo "Запуск PM2..."
pm2 delete like-that 2>/dev/null || true
pm2 start npm --name like-that -- start
pm2 save

echo ""
echo "=== Приложение запущено на порту 3000 ==="
echo "Добавь nginx и перезагрузи его:"
echo "  sudo cp $VPS_PATH/scripts/nginx-like-that.conf /etc/nginx/sites-available/like-that"
echo "  sudo ln -sf /etc/nginx/sites-available/like-that /etc/nginx/sites-enabled/0-like-that"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "Потом открой: http://130.49.149.162"
