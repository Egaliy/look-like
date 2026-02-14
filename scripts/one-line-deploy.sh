#!/bin/bash
# Один раз в консоли VPS вставь и нажми Enter:
# curl -sL https://raw.githubusercontent.com/Egaliy/look-like/main/scripts/one-line-deploy.sh | bash
set -e
mkdir -p /var/www && cd /var/www
if [ -d like-that/.git ]; then
  cd like-that && git fetch origin && git reset --hard origin/main
else
  rm -rf like-that
  git clone https://github.com/Egaliy/look-like.git like-that
  cd like-that
fi
bash scripts/deploy-on-server-with-log.sh
