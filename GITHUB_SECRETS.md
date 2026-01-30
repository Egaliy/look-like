# Инструкция по заполнению секретов в GitHub

## 📋 Что указать в форме создания секрета

### 1. Секрет: `VPS_HOST`

**Name:** `VPS_HOST`

**Secret:** Укажите IP адрес или домен вашего VPS сервера

Примеры:
- `123.45.67.89` (если у вас IP адрес)
- `example.com` (если у вас домен)
- `server.yourdomain.com` (если у вас поддомен)

**⚠️ ВАЖНО:** Укажите реальный адрес вашего сервера, на который нужно деплоить проект.

---

### 2. Секрет: `VPS_USER`

**Name:** `VPS_USER`

**Secret:** Имя пользователя для SSH подключения

Обычно это:
- `root` (для большинства VPS)
- `ubuntu` (для Ubuntu серверов)
- `deploy` (если создан отдельный пользователь для деплоя)
- Или другое имя пользователя, которое вы используете для SSH

**⚠️ ВАЖНО:** Укажите имя пользователя, которое имеет доступ к серверу и может выполнять команды git, npm и pm2.

---

### 3. Секрет: `VPS_SSH_KEY`

**Name:** `VPS_SSH_KEY`

**Secret:** Скопируйте и вставьте весь текст ниже (это ваш приватный SSH ключ):

```
-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ ВАЖНО:** 
- Скопируйте весь ключ целиком, включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`
- Не добавляйте лишних пробелов или переносов строк
- Убедитесь, что публичный ключ (`id_rsa.pub`) добавлен на сервер в файл `~/.ssh/authorized_keys`

---

### 4. Секрет: `VPS_PROJECT_PATH` (опционально)

**Name:** `VPS_PROJECT_PATH`

**Secret:** Путь к проекту на сервере

По умолчанию используется: `/var/www/like-that`

Если ваш проект находится в другом месте, укажите полный путь, например:
- `/home/deploy/like-that`
- `/opt/like-that`
- `/var/www/html/like-that`

**⚠️ ВАЖНО:** 
- Если не создадите этот секрет, будет использован путь по умолчанию `/var/www/like-that`
- Убедитесь, что указанный путь существует на сервере
- Убедитесь, что пользователь SSH имеет права на запись в эту директорию

---

## ✅ Порядок создания секретов

1. Откройте: https://github.com/Egaliy/look-like/settings/secrets/actions
2. Нажмите **"New repository secret"**
3. Создайте секреты в следующем порядке:
   - `VPS_HOST` (обязательно)
   - `VPS_USER` (обязательно)
   - `VPS_SSH_KEY` (обязательно) - используйте ключ выше
   - `VPS_PROJECT_PATH` (опционально)

## 🔍 Как проверить, что все работает

После создания всех секретов:

1. Сделайте любой коммит и push в ветку `main`
2. Перейдите в раздел **Actions** вашего репозитория
3. Вы увидите запуск workflow "Deploy to VPS"
4. Кликните на него, чтобы увидеть логи выполнения

## ⚠️ Если что-то не работает

1. Проверьте логи в GitHub Actions - там будут видны ошибки
2. Убедитесь, что публичный SSH ключ добавлен на сервер:
   ```bash
   ssh-copy-id user@your-server
   ```
3. Проверьте SSH подключение вручную:
   ```bash
   ssh -i ~/.ssh/id_rsa user@your-server
   ```
4. Убедитесь, что проект клонирован на сервере в указанной директории
5. Убедитесь, что на сервере установлены: git, node, npm, pm2
