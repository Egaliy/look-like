#!/bin/bash

# Скрипт для первоначальной настройки сервера
# Выполните на сервере через веб-консоль или другой доступ

set -e

echo "🔧 Настройка сервера для автоматического деплоя..."

# Устанавливаем необходимые пакеты
echo "📦 Устанавливаем необходимые пакеты..."
apt-get update -qq
apt-get install -y git nodejs npm curl

# Устанавливаем PM2 глобально
echo "📦 Устанавливаем PM2..."
npm install -g pm2

# Создаем директорию для проекта
PROJECT_PATH="/var/www/like-that"
mkdir -p "$PROJECT_PATH"

# Добавляем публичный SSH ключ для GitHub Actions
echo "🔑 Добавляем публичный SSH ключ..."
SSH_DIR="/root/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCx4EURU6jVukAtxOxrJzA5kpX1hQcPtTjfzDZRTfDWZnxyrjYYlIlWGHO0u9To8DyUrEU+ysV0Sa1773KIdPBd4OzgyNwlBEUSx5SE/ephqWKAJAXCKSPYHAIrgefB9F9ywlwbWPqL6EQAdx4qH7J/9cE/joln0bSC8mamRLkEFL2E5HuYJpfYvAW7sK8xlpOlTcxmGqu5mgWt1faG5aiVJbSHZawvpPOBFNe5cMBCdStbCvnOJs//xeuTLTDY/3OjZuI25UCVR4RkiKJZhkVdn+GcotLxJwCvcWv1132L/LUtm/s+DpW7culHHyc4+eu+cy+OPv4bhTABj7Pa4aGw7Ynl0RsEXqG8+n7YeCTv5JK4BL7jvqVbkNGEt0rdxqlDt07PwRnVr1trA6jjSFcx1TaVWmopjfHtPl67obqCvaqO6qkMPvyWLjWcWh8xgHG6s+5YW/Y2oPMsHd46Sw9EwYuCKK7KdOLgGnG7BwumMyJBJsJE0xI7a463gAwdhCuFEJB6n1NrfGEQkQQYfw9wO23bFE1AdKFfJ2fWo6z/gWZubzgseRY+TArM362BO4mkuFgVcmLLn0NcDh8B5s6csWGhSvwmE+4ldgJZ9GePGtNfHP7m8kr43Ld3z5Xp57Mn1re4cikcFllVHr72ss4ggvAAEhXh18HcaDk0wf20PQ== your_email@example.com"

echo "$PUBLIC_KEY" >> "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"

echo "✅ Сервер настроен!"
echo ""
echo "Теперь можно выполнить деплой, запустив deploy.sh на сервере"
