-- SQL Schema for xyi: SoundCloud Real-time Co-listening App
-- Paste this script into the Supabase SQL Editor (https://supabase.com dashboard)

-- 1. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    current_track_id UUID, -- References playlist.id below
    is_playing BOOLEAN DEFAULT FALSE NOT NULL,
    progress_ms INTEGER DEFAULT 0 NOT NULL,
    state_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    sender_id TEXT
);

-- 2. Create playlist table
CREATE TABLE IF NOT EXISTS public.playlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    track_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Loading track...',
    duration INTEGER DEFAULT 0 NOT NULL,
    thumbnail TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Add foreign key from rooms to playlist (resolving circular dependency with ON DELETE SET NULL)
-- We check if constraint exists first, or drop it and recreate it for safety
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS fk_rooms_current_track_id;
ALTER TABLE public.rooms 
  ADD CONSTRAINT fk_rooms_current_track_id 
  FOREIGN KEY (current_track_id) REFERENCES public.playlist(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Policies to allow anonymous read/write/update access
-- This ensures the app functions without requiring user registration/login.
DROP POLICY IF EXISTS "Allow public select on rooms" ON public.rooms;
CREATE POLICY "Allow public select on rooms" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on rooms" ON public.rooms;
CREATE POLICY "Allow public insert on rooms" ON public.rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on rooms" ON public.rooms;
CREATE POLICY "Allow public update on rooms" ON public.rooms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on rooms" ON public.rooms;
CREATE POLICY "Allow public delete on rooms" ON public.rooms FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select on playlist" ON public.playlist;
CREATE POLICY "Allow public select on playlist" ON public.playlist FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on playlist" ON public.playlist;
CREATE POLICY "Allow public insert on playlist" ON public.playlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on playlist" ON public.playlist;
CREATE POLICY "Allow public update on playlist" ON public.playlist FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on playlist" ON public.playlist;
CREATE POLICY "Allow public delete on playlist" ON public.playlist FOR DELETE USING (true);

-- 6. Enable Realtime Replication
-- Check if the supabase_realtime publication exists, and safely add tables to it.
-- This block is safe to run multiple times and compatible with older Postgres versions.
DO $$
BEGIN
  -- Add rooms to supabase_realtime if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'rooms' AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  -- Add playlist to supabase_realtime if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'playlist' AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist;
  END IF;
END $$;

-- 7. Personal & Public Rooms Migration (Run this if tables are already created)
-- ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_id TEXT UNIQUE;
-- ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL;
-- ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_name TEXT;

-- 8. Create profiles table for internal accounts customization
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_color TEXT,
    avatar_url TEXT, -- Base64 encoded optimized custom avatar image or emoji/preset identifier
    banner_url TEXT, -- Base64 encoded optimized custom banner image or gradient preset name
    bio TEXT,
    custom_badge TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add policies for secure profile management
DROP POLICY IF EXISTS "Allow public select on profiles" ON public.profiles;
CREATE POLICY "Allow public select on profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow user insert own profile" ON public.profiles;
CREATE POLICY "Allow user insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow user update own profile" ON public.profiles;
CREATE POLICY "Allow user update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Enable Realtime for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

