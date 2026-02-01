#!/bin/bash
# Деплой + полная настройка сервера одной командой. Запуск с твоего Mac: ./deploy-and-setup.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VPS_HOST="${VPS_HOST:-130.49.149.162}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/var/www/like-that}"

echo "=== 1. Деплой на сервер ==="
bash "$SCRIPT_DIR/deploy-direct.sh"

echo ""
echo "=== 2. Настройка автозапуска и сторожа на сервере ==="
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && export VPS_DOMAIN='$VPS_DOMAIN' && sudo -E bash scripts/setup-server-once.sh"

echo ""
echo "=== Готово. Сайт: http://$VPS_HOST ==="
