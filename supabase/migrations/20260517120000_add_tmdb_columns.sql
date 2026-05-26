ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS tmdb_id TEXT,
ADD COLUMN IF NOT EXISTS tmdb_media_type TEXT;

CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON public.movies(tmdb_id);
