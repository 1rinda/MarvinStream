
-- Watchlist (My List)
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  tmdb_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id),
  CONSTRAINT one_id_required CHECK (movie_id IS NOT NULL OR tmdb_id IS NOT NULL)
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own watchlist') THEN
        CREATE POLICY "Users manage own watchlist" ON public.watchlists FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Video Progress (Continue Watching)
CREATE TABLE IF NOT EXISTS public.video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  tmdb_id TEXT,
  last_position_seconds FLOAT NOT NULL DEFAULT 0,
  duration_seconds FLOAT NOT NULL DEFAULT 0,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id),
  CONSTRAINT one_id_required_progress CHECK (movie_id IS NOT NULL OR tmdb_id IS NOT NULL)
);

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own progress') THEN
        CREATE POLICY "Users manage own progress" ON public.video_progress FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE OR REPLACE TRIGGER video_progress_updated_at BEFORE UPDATE ON public.video_progress FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Extra User Profiles (Multi-Profile)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_kids BOOLEAN NOT NULL DEFAULT false;

-- Ensure RLS is correct for multi-profile
DROP POLICY IF EXISTS "Users manage own profiles" ON public.profiles;
CREATE POLICY "Users manage own profiles" ON public.profiles FOR ALL USING (auth.uid() = user_id);

