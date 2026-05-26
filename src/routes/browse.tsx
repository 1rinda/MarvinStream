import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MovieCard, MovieRow, type Movie } from "@/components/movie-row";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { TmdbPopularResponse, TmdbSearchResult } from "@/integrations/tmdb/types";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse — U Stream" },
      { name: "description", content: "Browse all movies and series available on U Stream." },
    ],
  }),
  component: Browse,
});

const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

function Browse() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [genreId, setGenreId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const { data: popularMovies = [], isLoading: isLoadingPopular } = useQuery({
    queryKey: ["tmdb", "popular"],
    queryFn: async () => {
      // Fetch multiple pages to get "a lot" of movies
      const pages = [1, 2, 3];
      const results = await Promise.all(
        pages.map(async (p) => {
          const res = await fetch(`/api/tmdb/popular?page=${p}`);
          if (!res.ok) return [];
          const data = (await res.json()) as TmdbPopularResponse;
          return data.results || [];
        }),
      );

      return results.flat().map((m) => ({
        id: `tmdb-${m.tmdb_id}`,
        title: m.title,
        description: m.overview,
        release_year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
        rating: m.vote_average?.toFixed(1),
        genres: (m.genre_ids || []).map((id) => TMDB_GENRES[id] || "").filter(Boolean),
        genre_ids: m.genre_ids,
        poster_url: m.poster_url,
        backdrop_url: m.backdrop_url,
        tmdb_id: m.tmdb_id,
        tmdb_media_type: "movie",
      })) as (Movie & { genre_ids?: number[] })[];
    },
    enabled: !!user && !q,
  });

  const { data: searchResults = [], isLoading: isLoadingSearch } = useQuery({
    queryKey: ["tmdb", "search", q],
    queryFn: async () => {
      if (!q) return [];
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      const data = (await res.json()) as TmdbSearchResult[];
      return data.map((m) => ({
        id: `tmdb-${m.tmdb_id}`,
        title: m.title,
        description: m.overview,
        release_year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
        rating: m.vote_average?.toFixed(1),
        genres: [], // Search results don't always have genres in the multi-search response
        poster_url: m.poster_url,
        backdrop_url: m.backdrop_url,
        tmdb_id: m.tmdb_id,
        tmdb_media_type: m.media_type,
      })) as Movie[];
    },
    enabled: !!user && !!q,
  });

  const displayedMovies = q ? searchResults : popularMovies;
  const isLoading = q ? isLoadingSearch : isLoadingPopular;

  const filteredMovies = useMemo(() => {
    if (!genreId) return displayedMovies;
    return (displayedMovies as (Movie & { genre_ids?: number[] })[]).filter((m) =>
      m.genre_ids?.includes(genreId),
    );
  }, [displayedMovies, genreId]);

  const groupedByGenre = useMemo(() => {
    if (q || genreId) return {};
    const groups: Record<string, Movie[]> = {};
    Object.entries(TMDB_GENRES).forEach(([idStr, name]) => {
      const id = parseInt(idStr);
      const items = (popularMovies as (Movie & { genre_ids?: number[] })[]).filter((m) =>
        m.genre_ids?.includes(id),
      );
      if (items.length > 0) {
        groups[name] = items;
      }
    });
    return groups;
  }, [popularMovies, q, genreId]);

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[120px] pb-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-10 mb-12">
          <h1 className="font-display text-5xl md:text-7xl mb-8 animate-in slide-in-from-left-4 fade-in duration-500">
            Browse
          </h1>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center animate-in slide-in-from-left-4 fade-in duration-500 delay-100">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search movies…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setGenreId(null);
                }}
                className="pl-10 h-12 bg-white/5 border-white/10 rounded-full focus:bg-white/10 transition-all text-base"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full mask-fade-right pb-2">
              <button
                onClick={() => setGenreId(null)}
                className={`shrink-0 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border transition-all ${!genreId ? "bg-primary border-primary text-white shadow-glow" : "border-white/10 bg-white/5 hover:bg-white/10 text-white/60"}`}
              >
                All
              </button>
              {Object.entries(TMDB_GENRES).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setGenreId(genreId === parseInt(id) ? null : parseInt(id))}
                  className={`shrink-0 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border transition-all ${genreId === parseInt(id) ? "bg-primary border-primary text-white shadow-glow" : "border-white/10 bg-white/5 hover:bg-white/10 text-white/60"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 md:px-10 text-muted-foreground animate-pulse">
            Fetching from the cinema…
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-32 animate-in fade-in zoom-in duration-500">
            <Search className="size-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground text-lg">Nothing matches your search.</p>
          </div>
        ) : q || genreId ? (
          <div className="max-w-[1600px] mx-auto px-4 md:px-10 animate-in fade-in duration-700">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="font-display text-3xl uppercase tracking-wider">
                {q ? `Results for "${q}"` : TMDB_GENRES[genreId!] + " Movies"}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredMovies.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-20 animate-in fade-in duration-1000">
            {Object.entries(groupedByGenre).map(([name, items], idx) => (
              <div
                key={name}
                className="animate-in slide-in-from-bottom-8 fade-in duration-700"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <MovieRow title={name} movies={items} />
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
