#!/usr/bin/env node
/**
 * Следит за изменениями в коде и при каждом сохранении деплоит на сервер.
 * Запуск: npm run deploy:watch
 * Деплой: ./deploy-direct.sh (должен быть настроен SSH к серверу)
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const WATCH_DIRS = ["app", "components", "lib", "prisma", "public"];
const WATCH_FILES = ["next.config.js", "tailwind.config.ts", "package.json", "tsconfig.json"];
const DEBOUNCE_MS = 2500;

let debounceTimer = null;

function watchDir(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return;
  fs.watch(
    full,
    { recursive: true },
    (_, filename) => filename && scheduleDeploy(filename)
  );
}

function watchFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  fs.watch(full, (_, filename) => filename && scheduleDeploy(filename));
}

function scheduleDeploy(name) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDeploy, DEBOUNCE_MS);
  console.log(`[watch] ${name} → деплой через ${DEBOUNCE_MS / 1000} сек`);
}

function runDeploy() {
  debounceTimer = null;
  console.log("\n📤 Деплой на сервер...\n");
  const child = spawn("./deploy-direct.sh", [], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  child.on("close", (code) => {
    console.log(code === 0 ? "\n✅ Деплой завершён\n" : "\n❌ Деплой завершился с ошибкой\n");
  });
}

console.log("👀 Слежу за изменениями (деплой при сохранении). Остановка: Ctrl+C\n");
WATCH_DIRS.forEach(watchDir);
WATCH_FILES.forEach(watchFile);
console.log("Готово. Сохрани файл — через пару секунд пойдёт деплой.\n");
