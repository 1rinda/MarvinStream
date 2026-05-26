import { useQuery } from "@tanstack/react-query";
import { useWatchlist } from "@/hooks/use-watchlist";
import { MovieRow, type Movie } from "./movie-row";
import { supabase } from "@/integrations/supabase/client";
import type { TmdbMovieDetails } from "@/integrations/tmdb/types";

export function MyListRow() {
  const { watchlist, isLoading: loadingList } = useWatchlist();

  const { data: movies = [], isLoading: loadingDetails } = useQuery({
    queryKey: ["watchlist-movies", watchlist.map((w) => w.id).join(",")],
    queryFn: async () => {
      if (watchlist.length === 0) return [];

      const results = await Promise.all(
        watchlist.map(async (item) => {
          if (item.movie_id) {
            const { data, error } = await supabase
              .from("movies")
              .select("*")
              .eq("id", item.movie_id)
              .maybeSingle();
            if (error) return null;
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
    enabled: watchlist.length > 0,
  });

  if (loadingList || (watchlist.length > 0 && loadingDetails)) {
    return (
      <div className="px-4 md:px-10 py-10 animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded mb-6" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shrink-0 w-[220px] aspect-[2/3] bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) return null;

  return <MovieRow title="My List" movies={movies} />;
}
