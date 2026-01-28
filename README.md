# Look Like - Swipe-based Reference Review

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
DATABASE_URL="postgresql://user:password@localhost:5432/looklike"
NEXTAUTH_URL="http://localhost:3000"
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

Откройте [http://localhost:3000](http://localhost:3000)

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
