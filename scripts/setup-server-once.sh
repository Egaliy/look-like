#!/bin/bash
# Однократная настройка сервера: автозапуск приложения после перезагрузки + сторож.
# Запуск на VPS после первого деплоя: cd /var/www/like-that && sudo bash scripts/setup-server-once.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== Настройка сервера: $PROJECT_DIR ==="
echo ""

# 1. Запуск приложения в PM2 (если ещё не запущено)
if ! pm2 describe like-that >/dev/null 2>&1; then
  echo "1. Запуск приложения в PM2..."
  pm2 start npm --name "like-that" -- start
else
  echo "1. Приложение уже в PM2."
  pm2 restart like-that 2>/dev/null || true
fi

pm2 save
echo "   PM2 save — список процессов сохранён."
echo ""

# 2. Автозапуск PM2 при загрузке системы (выполняем команду автоматически)
echo "2. Автозапуск PM2 после перезагрузки..."
STARTUP_CMD=$(pm2 startup 2>/dev/null | grep -o 'sudo.*' | head -1)
if [[ -n "$STARTUP_CMD" ]]; then
  eval "$STARTUP_CMD" 2>/dev/null || true
fi
pm2 save
echo ""

# 3. Сторож в cron (перезапуск при падении, при необходимости — перезагрузка)
WATCHDOG="$PROJECT_DIR/scripts/server-watchdog.sh"
CRON_LINE="*/5 * * * * $WATCHDOG >> /var/log/like-that-watchdog.log 2>&1"

if [[ -f "$WATCHDOG" ]]; then
  chmod +x "$WATCHDOG"
  if crontab -l 2>/dev/null | grep -q "server-watchdog.sh"; then
    echo "3. Сторож уже добавлен в cron."
  else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "3. Сторож добавлен в cron (проверка каждые 5 мин)."
  fi
else
  echo "3. Файл сторожа не найден: $WATCHDOG (добавь в cron после деплоя)."
fi
echo ""

# 4. Nginx для домена (если задан VPS_DOMAIN)
if [[ -n "$VPS_DOMAIN" ]]; then
  echo "4. Nginx для домена $VPS_DOMAIN..."
  NGINX_CONF="/etc/nginx/sites-available/like-that"
  cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $VPS_DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/like-that 2>/dev/null || true
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null && echo "   Nginx перезагружен." || echo "   Nginx: проверь конфиг вручную."
else
  echo "4. VPS_DOMAIN не задан — nginx не трогаем."
fi
echo ""

echo "=== Готово. Приложение и автозапуск настроены. ==="
