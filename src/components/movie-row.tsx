import { Link } from "@tanstack/react-router";
import { Play, Plus, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { TrailerModal } from "@/components/trailer-modal";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Skeleton } from "@/components/ui/skeleton";

export type Movie = {
  id: string;
  title: string;
  description?: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number | null;
  rating: string | null;
  genres: string[];
  tmdb_id?: string | null;
  tmdb_media_type?: string | null;
  trailer_url?: string | null;
};

export function MovieRow({
  title,
  movies,
  isLoading,
}: {
  title: string;
  movies: Movie[];
  isLoading?: boolean;
}) {
  if (!isLoading && !movies.length) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 px-4 md:px-10">
        <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wider">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="flex gap-6 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-8 mask-fade-right">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <MovieSkeleton key={i} />)
          : movies.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
    </section>
  );
}

export function MovieSkeleton() {
  return (
    <div className="shrink-0 w-[180px] md:w-[260px] aspect-[2/3] space-y-4">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );
}

export function MovieCard({ movie }: { movie: Movie }) {
  const { user } = useAuth();
  const { inWatchlist, toggleWatchlist, isToggling } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null | undefined>(
    movie.trailer_url ?? null,
  );
  const [loading, setLoading] = useState(false);

  async function openTrailer(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return; // safety check
    if (!trailerUrl && movie.tmdb_id) {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (movie.tmdb_media_type) params.set("mediaType", movie.tmdb_media_type);
        const res = await fetch(
          `/api/tmdb/movie/${encodeURIComponent(String(movie.tmdb_id))}?${params.toString()}`,
        );
        if (res.ok) {
          const j = await res.json();
          setTrailerUrl(j.trailer_url ?? null);
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  }

  const movieId = movie.id.startsWith("tmdb-") ? undefined : movie.id;
  const tmdbId =
    movie.tmdb_id || (movie.id.startsWith("tmdb-") ? movie.id.replace("tmdb-", "") : undefined);
  const isInList = inWatchlist(movieId, tmdbId);

  return (
    <>
      <Link
        to="/movie/$id"
        params={{ id: movie.id }}
        search={{ play: true }}
        className="group relative shrink-0 w-[180px] md:w-[260px] aspect-[2/3] overflow-hidden bg-surface-2 border border-foreground/5 hover:border-primary/50 transition-all duration-700 ease-out hover:z-20 hover:scale-105 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover transition duration-1000 ease-in-out grayscale group-hover:grayscale-0"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-display text-2xl text-center p-6 bg-surface-3">
            {movie.title}
          </div>
        )}

        {/* Editorial Overlay */}
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-500" />

        <div className="absolute bottom-0 inset-x-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out bg-gradient-to-t from-background via-background/80 to-transparent">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
            <span className="size-1 bg-primary rounded-full animate-pulse" />
            Live_Broadcast
          </div>
          <h3 className="font-display text-3xl leading-[0.8] mb-4 text-foreground italic group-hover:not-italic transition-all">
            {movie.title}
          </h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="font-mono text-[9px] border border-foreground/20 px-2 py-0.5">
              {movie.release_year}
            </span>
            <span className="font-mono text-[9px] border border-foreground/20 px-2 py-0.5 text-accent">
              {movie.rating} PNT
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={openTrailer}
              className="flex-1 border border-foreground font-mono text-[9px] py-3 uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="size-3 animate-spin" />}
              {loading ? "FETCHING..." : "VIEW_TRAILER"}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWatchlist({ movieId, tmdbId });
              }}
              disabled={isToggling}
              className="border border-foreground p-3 hover:bg-primary hover:border-primary hover:text-white transition-colors"
            >
              {isInList ? <Check className="size-4" /> : <Plus className="size-4" />}
            </button>
          </div>
        </div>

        {/* Cinematic Corner Accents */}
        <div className="absolute top-4 left-4 size-4 border-t border-l border-white/0 group-hover:border-white/40 transition-all" />
        <div className="absolute top-4 right-4 size-4 border-t border-r border-white/0 group-hover:border-white/40 transition-all" />
      </Link>

      <TrailerModal
        open={open}
        onOpenChange={setOpen}
        trailerUrl={trailerUrl}
        title={movie.title}
      />
    </>
  );
}
