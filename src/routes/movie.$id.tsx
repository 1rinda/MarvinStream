import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Plus, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { TrailerModal } from "@/components/trailer-modal";
import { VideoPlayer } from "@/components/video-player";
import type { TmdbMovieDetails } from "@/integrations/tmdb/types";
import { useAuth } from "@/hooks/use-auth";
import { useWatchlist } from "@/hooks/use-watchlist";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type EnrichedMovie = Tables<"movies"> & {
  tagline?: string;
  director?: string;
  cast?: string[];
};

const movieSearchSchema = z.object({
  play: z.boolean().optional().catch(false),
});

export const Route = createFileRoute("/movie/$id")({
  validateSearch: movieSearchSchema,
  component: MoviePage,
});

function MoviePage() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const { play } = Route.useSearch();
  const { inWatchlist, toggleWatchlist, isToggling } = useWatchlist();
  const [playing, setPlaying] = useState(false);
  const [openTrailer, setOpenTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null | undefined>(undefined);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return data;

      // If tmdb_id is present, fetch TMDB and prefer TMDB fields for display
      try {
        if (data.tmdb_id) {
          const mediaType = data.tmdb_media_type === "tv" ? "tv" : "movie";
          const res = await fetch(
            `/api/tmdb/movie/${encodeURIComponent(data.tmdb_id)}?mediaType=${encodeURIComponent(mediaType)}`,
          );
          const tmdb = res.ok ? ((await res.json()) as TmdbMovieDetails) : null;
          if (tmdb) {
            return {
              ...data,
              title: tmdb.title ?? data.title,
              description: tmdb.overview ?? data.description,
              poster_url: tmdb.poster_url ?? data.poster_url,
              backdrop_url: tmdb.backdrop_url ?? data.backdrop_url,
              release_year: tmdb.release_date
                ? parseInt(tmdb.release_date.slice(0, 4))
                : data.release_year,
              duration_minutes: tmdb.runtime ?? data.duration_minutes,
              rating: tmdb.vote_average?.toFixed(1) ?? data.rating,
              genres: tmdb.genres?.map((genre) => genre.name) ?? data.genres,
              trailer_url: tmdb.trailer_url ?? data.trailer_url,
              tagline: tmdb.tagline as string | undefined,
              director: tmdb.credits?.crew?.find((c) => c.job === "Director")?.name,
              cast: tmdb.credits?.cast?.slice(0, 10).map((c) => c.name),
            } as EnrichedMovie;
          }
        }
      } catch (e) {
        // Non-fatal
        console.warn("TMDB fetch failed", e);
      }

      return data as EnrichedMovie;
    },
  });

  useEffect(() => {
    if (play && movie?.video_url && user) {
      setPlaying(true);
    }
  }, [play, movie?.video_url, user]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="font-display text-xl uppercase tracking-widest">Loading Cinema…</span>
        </div>
      </div>
    );
  if (!movie)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-2">Not found</h1>
          <Link to="/" className="text-primary">
            Back home
          </Link>
        </div>
      </div>
    );

  const movieId = movie.id.startsWith("tmdb-") ? undefined : movie.id;
  const tmdbId =
    movie.tmdb_id || (movie.id.startsWith("tmdb-") ? movie.id.replace("tmdb-", "") : undefined);
  const isInList = inWatchlist(movieId, tmdbId);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {playing && movie.video_url ? (
        <div className="pt-[68px] bg-black min-h-screen flex items-center">
          <VideoPlayer
            src={movie.video_url}
            movieId={movieId}
            tmdbId={tmdbId}
            title={movie.title}
            onBack={() => setPlaying(false)}
          />
        </div>
      ) : (
        <>
          <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden bg-background">
            {movie.backdrop_url || movie.poster_url ? (
              <img
                src={movie.backdrop_url ?? movie.poster_url ?? ""}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 mix-blend-luminosity animate-in fade-in zoom-in-105 duration-1000"
              />
            ) : (
              <div className="absolute inset-0 bg-surface-2" />
            )}

            <div className="absolute inset-0 gradient-overlay-hero opacity-80" />
            <div className="absolute inset-0 gradient-fade-bottom" />
            <div className="absolute inset-0 vignette-hero" />

            <div className="relative max-w-[1800px] mx-auto w-full px-6 md:px-12 py-32 mt-20">
              <div className="animate-in slide-in-from-bottom-12 fade-in duration-1000">
                <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary mb-8 flex items-center gap-4 text-white">
                  <span className="h-[1px] w-12 bg-primary" />
                  Metadata_Session_{movie.tmdb_id || "LOCAL"}
                </div>

                <h1 className="font-display text-[10vw] leading-[0.8] tracking-tighter text-white mb-12 select-none uppercase">
                  {movie.title}
                </h1>

                <div className="grid lg:grid-cols-2 gap-16 items-start">
                  <div className="space-y-12">
                    <div className="flex flex-wrap items-center gap-8 font-mono text-[11px] uppercase tracking-widest text-white/40">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-primary">Year</span>
                        <span className="text-white">{movie.release_year}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-primary">Duration</span>
                        <span className="text-white">
                          {Math.floor((movie.duration_minutes || 0) / 60)}H{" "}
                          {(movie.duration_minutes || 0) % 60}M
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-primary">Rating</span>
                        <span className="text-white">{movie.rating} PNT</span>
                      </div>
                    </div>

                    {movie.tagline && (
                      <p className="text-2xl md:text-3xl text-primary font-serif italic border-l-2 border-primary pl-8 py-2">
                        "{movie.tagline}"
                      </p>
                    )}

                    <p className="text-lg md:text-xl text-white/60 leading-tight font-light max-w-2xl">
                      {movie.description}
                    </p>

                    <div className="flex flex-wrap gap-8">
                      {user ? (
                        <>
                          {movie.video_url ? (
                            <button
                              onClick={() => setPlaying(true)}
                              className="magnetic-btn bg-primary text-white px-12 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex items-center gap-4 group"
                            >
                              <Play className="size-4 fill-current group-hover:scale-125 transition-transform" />{" "}
                              Engage_Stream
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-12 py-6 border border-white/20 text-white/40 font-mono text-[11px] uppercase tracking-widest"
                            >
                              Status: Offline
                            </button>
                          )}

                          <button
                            disabled={isToggling}
                            onClick={() => toggleWatchlist({ movieId, tmdbId })}
                            className="magnetic-btn border border-white px-10 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex items-center gap-4 text-white"
                          >
                            {isInList ? (
                              <Check className="size-4 text-primary" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                            Archive_Title
                          </button>
                        </>
                      ) : (
                        <Link to="/login">
                          <button className="bg-primary text-white px-12 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                            Initiate_Session
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="hidden lg:block space-y-12 border-l border-white/10 pl-16">
                    {movie.director && (
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary block">
                          Principal_Director
                        </span>
                        <span className="text-3xl font-display uppercase tracking-tight text-white">
                          {movie.director}
                        </span>
                      </div>
                    )}
                    {movie.cast && movie.cast.length > 0 && (
                      <div className="space-y-4">
                        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary block">
                          Lead_Assets
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {movie.cast.slice(0, 8).map((name) => (
                            <span
                              key={name}
                              className="font-mono text-[10px] border border-white/20 text-white/60 px-3 py-1 hover:border-primary hover:text-white transition-colors cursor-default"
                            >
                              {name.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {user && movie.trailer_url && (
            <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-40">
              <div className="flex items-center gap-8 mb-16">
                <h2 className="font-display text-5xl uppercase tracking-tighter italic text-foreground">
                  Signal_Preview
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary to-transparent" />
              </div>
              <div className="aspect-video bg-black overflow-hidden border border-foreground/10 group relative">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none" />
                {/youtube\.com|youtu\.be/.test(movie.trailer_url) ? (
                  <iframe
                    src={toYouTubeEmbed(movie.trailer_url)}
                    className="w-full h-full grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={movie.trailer_url}
                    controls
                    className="w-full h-full grayscale group-hover:grayscale-0 transition-all"
                  />
                )}
              </div>
            </section>
          )}
          <TrailerModal
            open={openTrailer}
            onOpenChange={setOpenTrailer}
            trailerUrl={trailerUrl ?? movie.trailer_url}
            title={movie.title}
          />
        </>
      )}
    </div>
  );
}

function toYouTubeEmbed(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}
