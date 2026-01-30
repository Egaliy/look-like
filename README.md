# Like That - Swipe-based Reference Review

Tinder-like веб-приложение для оценки визуальных референсов клиентами.

## Технологии

- **Frontend:** Next.js 14 (App Router), React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js
- **Storage:** S3-compatible storage (AWS S3 / Cloudflare R2)

## Установка

```bash
npm install
```

## Настройка базы данных

1. Создайте файл `.env` с переменными окружения:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/like_that"
# Локальная разработка:
NEXTAUTH_URL="http://localhost:3000"
# На сервере (продакшен):
# NEXTAUTH_URL="http://130.49.149.162"
NEXTAUTH_SECRET="your-secret-key-here"
```

2. Запустите миграции:
```bash
npx prisma generate
npx prisma db push
```

## Запуск

```bash
npm run dev
```

- **Локально:** [http://localhost:3000](http://localhost:3000)
- **На сервере:** [http://130.49.149.162](http://130.49.149.162)

## Сервер: если сайт не работает

Если админка открывается, но «Сервер» и «Проекты» висят на «Загрузка…» — на сервере нет или повреждён `.env`.

1. Открой консоль сервера (в панели VPS: «Открыть консоль»).
2. Перейди в папку проекта и создай `.env`:
```bash
cd /var/www/look-like
nano .env
```
3. Вставь (подставь свои значения):
```env
DATABASE_URL="postgresql://...строка из Supabase → Settings → Database..."
NEXTAUTH_URL="http://130.49.149.162"
NEXTAUTH_SECRET="любая-длинная-случайная-строка"
```
Сохрани: Ctrl+O, Enter, Ctrl+X.
4. Перезапусти приложение:
```bash
pm2 restart look-like
```

Блокировка портов 25 и 465 в панели относится только к почте; для сайта (80/443) это не мешает.

## Структура проекта

- `/app` - Next.js App Router страницы
- `/components` - React компоненты
- `/lib` - утилиты и конфигурация
- `/prisma` - Prisma схема и миграции
- `/public` - статические файлы

## MVP Функционал

### Клиент (по уникальной ссылке)
- Swipe-интерфейс для оценки 50 изображений
- Кнопки Like/Dislike/Undo
- Галерея понравившихся референсов
- Счетчик прогресса

### Админ панель
- Создание наборов референсов
- Загрузка изображений
- Генерация уникальных ссылок
- Просмотр результатов и экспорт данных
