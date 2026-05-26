import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MovieRow, type Movie } from "./movie-row";
import type { TmdbMovieDetails } from "@/integrations/tmdb/types";

export function ContinueWatchingRow() {
  const { user } = useAuth();

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["continue-watching", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: progress, error } = await supabase
        .from("video_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_finished", false)
        .order("updated_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      if (!progress.length) return [];

      const results = await Promise.all(
        progress.map(async (item) => {
          if (item.movie_id) {
            const { data } = await supabase
              .from("movies")
              .select("*")
              .eq("id", item.movie_id)
              .maybeSingle();
            return data as Movie;
          } else if (item.tmdb_id) {
            try {
              const res = await fetch(`/api/tmdb/movie/${encodeURIComponent(item.tmdb_id)}`);
              if (!res.ok) return null;
              const tmdb = (await res.json()) as TmdbMovieDetails;
              return {
                id: `tmdb-${tmdb.id}`,
                title: tmdb.title || tmdb.name || "",
                poster_url: tmdb.poster_url,
                backdrop_url: tmdb.backdrop_url,
                release_year: tmdb.release_date
                  ? parseInt(tmdb.release_date.slice(0, 4))
                  : undefined,
                rating: tmdb.vote_average?.toFixed(1),
                genres: tmdb.genres?.map((g) => g.name) || [],
                tmdb_id: String(tmdb.id),
                tmdb_media_type: tmdb.media_type || "movie",
              } as Movie;
            } catch (e) {
              return null;
            }
          }
          return null;
        }),
      );

      return results.filter((m): m is Movie => m !== null);
    },
    enabled: !!user,
  });

  if (isLoading || movies.length === 0) return null;

  return <MovieRow title="Continue Watching" movies={movies} />;
}
