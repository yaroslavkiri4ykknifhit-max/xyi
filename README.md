# xyi — SoundCloud Co-listening Web App

**xyi** — это современное, ультраминималистичное веб-приложение для синхронного совместного прослушивания музыки с SoundCloud в реальном времени. Дизайн разработан по канонам эстетики **iOS 26** — глубокий черный фон, полупрозрачные стеклянные контейнеры (glassmorphism), обилие свободного пространства и фирменный оранжевый акцент SoundCloud.

---

## 🚀 Быстрый запуск

### Шаг 1. Настройка базы данных в Supabase

1. Зарегистрируйтесь или войдите в [Supabase](https://supabase.com/).
2. Создайте новый проект и перейдите во вкладку **SQL Editor** в левом боковом меню.
3. Нажмите **New Query** и вставьте содержимое файла `supabase_schema.sql` (или скопируйте скрипт ниже):

```sql
-- 1. Создание таблицы комнат
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    current_track_id UUID,
    is_playing BOOLEAN DEFAULT FALSE NOT NULL,
    progress_ms INTEGER DEFAULT 0 NOT NULL,
    state_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    sender_id TEXT
);

-- 2. Создание таблицы плейлиста
CREATE TABLE IF NOT EXISTS public.playlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    track_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Loading track...',
    duration INTEGER DEFAULT 0 NOT NULL,
    thumbnail TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Связывание таблиц внешним ключом
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS fk_rooms_current_track_id;
ALTER TABLE public.rooms 
  ADD CONSTRAINT fk_rooms_current_track_id 
  FOREIGN KEY (current_track_id) REFERENCES public.playlist(id) ON DELETE SET NULL;

-- 4. Активация RLS (безопасность на уровне строк)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist ENABLE ROW LEVEL SECURITY;

-- 5. Создание публичных политик для анонимного доступа (без авторизации)
CREATE POLICY "Allow public select on rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on rooms" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "Allow public select on playlist" ON public.playlist FOR SELECT USING (true);
CREATE POLICY "Allow public insert on playlist" ON public.playlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on playlist" ON public.playlist FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on playlist" ON public.playlist FOR DELETE USING (true);

-- 6. Включение Realtime репликации комнат и плейлистов
BEGIN;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.rooms, public.playlist;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.playlist;
COMMIT;
```
4. Нажмите кнопку **Run** в правом нижнем углу для выполнения скрипта.

---

### Шаг 2. Настройка переменных окружения

Создайте в корне проекта файл `.env.local` и добавьте туда свои ключи из панели управления Supabase (**Project Settings** -> **API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Шаг 3. Локальный запуск проекта

В корневой директории выполните команды в терминале:

1. **Установка зависимостей:**
   ```bash
   npm install
   ```
2. **Запуск сервера разработки:**
   ```bash
   npm run dev
   ```

Откройте [http://localhost:3000](http://localhost:3000) на своем компьютере или мобильном устройстве!

---

## ☁️ Деплой на Vercel

Чтобы развернуть проект в продакшене бесплатно с помощью Vercel:

1. Создайте публичный или приватный репозиторий на GitHub и отправьте туда код:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```
2. Перейдите на [Vercel](https://vercel.com/) и нажмите **Add New** -> **Project**.
3. Импортируйте ваш репозиторий.
4. В разделе **Environment Variables** добавьте две переменные:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Нажмите **Deploy**. Проект будет автоматически собран и опубликован!

---

## 🛠 Технический стек и особенности

* **Фреймворк:** [Next.js (App Router)](https://nextjs.org/) — серверный рендеринг, оптимизированные шрифты и роутинг.
* **Стилизация:** [Tailwind CSS v4](https://tailwindcss.com/) — продвинутые стеклянные эффекты (glassmorphism), кастомная палитра и iOS анимация.
* **База данных и синхронизация:** [Supabase](https://supabase.com/) — хранение комнат и плейлистов, мгновенная репликация состояний плеера через PostgreSQL Realtime Change Data Capture (CDC).
* **Медиаплеер:** [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget) — программный контроль воспроизведения и треков через postMessage.
* **Интеллектуальная синхронизация:** Использование формулы **Drift Correction** (коррекция дрейфа). Она вычисляет разницу времени между сервером и текущим положением плеера у разных участников и производит мягкую перемотку трека только если рассинхронизация превышает **2.5 секунды**, предотвращая постоянные подергивания звука при микро-лагах сети.
* **Floating Controls Dock:** Парящий нижний док управления (Play/Pause, прогресс-бар, Prev/Next, копирование ссылки приглашения), вдохновленный дизайном новейших систем Apple.
