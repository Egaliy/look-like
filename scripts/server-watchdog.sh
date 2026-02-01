#!/bin/bash
# Сторож на сервере: если приложение не отвечает — перезапуск PM2; если сервер завис — перезагрузка.
# Ставится на VPS в cron. Настрой один раз — дальше сервер сам восстанавливается.

set -e

APP_URL="${APP_URL:-http://127.0.0.1:3000}"
HEALTH_PATH="${HEALTH_PATH:-/api/admin/health}"
STATE_FILE="${STATE_FILE:-/tmp/like-that-watchdog.state}"
FAIL_THRESHOLD=2          # сколько проверок подряд "down" перед действием
REBOOT_AFTER_FAILURES=6   # после скольких неудач подряд делать reboot (примерно 30 мин при cron каждые 5 мин)
COOLDOWN_SEC=60           # не перезапускать PM2 чаще чем раз в минуту

ok() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $*" >&2; }

# Проверка: приложение отвечает?
check_app() {
  curl -sf --connect-timeout 5 --max-time 10 "${APP_URL}${HEALTH_PATH}" >/dev/null 2>&1
}

# Читаем счётчики
read_fail_count() {
  if [[ -f "$STATE_FILE" ]]; then
    source "$STATE_FILE" 2>/dev/null || true
  fi
  echo "${FAIL_COUNT:-0}"
}

read_last_restart() {
  if [[ -f "$STATE_FILE" ]]; then
    source "$STATE_FILE" 2>/dev/null || true
  fi
  echo "${LAST_RESTART:-0}"
}

write_state() {
  local fails=$1
  local restart=$2
  echo "FAIL_COUNT=$fails" > "$STATE_FILE"
  echo "LAST_RESTART=$restart" >> "$STATE_FILE"
}

if check_app; then
  # Всё ок — сбрасываем счётчик
  write_state 0 "$(read_last_restart)"
  ok "app responds"
  exit 0
fi

FAIL_COUNT=$(($(read_fail_count) + 1))
ok "app down, fail count=$FAIL_COUNT"

if [[ "$FAIL_COUNT" -lt "$FAIL_THRESHOLD" ]]; then
  write_state "$FAIL_COUNT" "$(read_last_restart)"
  exit 0
fi

# Пробуем перезапустить PM2
LAST=$(read_last_restart)
NOW=$(date +%s)
if [[ $((NOW - LAST)) -lt $COOLDOWN_SEC ]]; then
  warn "cooldown, skip restart"
  write_state "$FAIL_COUNT" "$LAST"
  exit 0
fi

warn "restarting pm2 like-that..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart like-that 2>/dev/null || pm2 start npm --name like-that -- start
  # Не сбрасываем счётчик — если после рестарта всё ещё down, дойдём до reboot
  write_state "$FAIL_COUNT" "$NOW"
  ok "pm2 restarted"
else
  write_state "$FAIL_COUNT" "$LAST"
  warn "pm2 not found"
  exit 1
fi

# Если перезапуск PM2 не помог много раз подряд — перезагрузка сервера
if [[ "$FAIL_COUNT" -ge "$REBOOT_AFTER_FAILURES" ]]; then
  warn "too many failures, rebooting in 60s..."
  echo "Watchdog: rebooting due to repeated failures" | logger -t like-that-watchdog 2>/dev/null || true
  sleep 60
  sudo -n reboot 2>/dev/null || warn "sudo reboot failed (add NOPASSWD for reboot?)"
fi

exit 0
