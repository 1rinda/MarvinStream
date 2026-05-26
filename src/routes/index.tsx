import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MovieRow, type Movie } from "@/components/movie-row";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { TrailerModal } from "@/components/trailer-modal";
import type { TmdbPopularResponse } from "@/integrations/tmdb/types";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/hooks/use-profiles";
import { MyListRow } from "@/components/my-list-row";
import { ContinueWatchingRow } from "@/components/continue-watching-row";
import { MovieCard } from "@/components/movie-row";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const isKids = activeProfile?.is_kids;

  // Prefer TMDB popular for landing page
  const { data, isLoading } = useQuery({
    queryKey: ["movies", "home", isKids],
    queryFn: async () => {
      try {
        // Fetch 3 pages of popular movies for a richer landing page
        const pages = [1, 2, 3];
        const results = await Promise.all(
          pages.map(async (p) => {
            const res = await fetch(`/api/tmdb/popular?page=${p}`);
            if (!res.ok) return [];
            const json = (await res.json()) as TmdbPopularResponse;
            return json.results || [];
          }),
        );

        let allMovies = results.flat().map((m) => ({
          id: `tmdb-${m.tmdb_id}`,
          title: m.title,
          description: m.overview,
          release_year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : undefined,
          rating: m.vote_average?.toFixed(1),
          genres: [],
          poster_url: m.poster_url,
          backdrop_url: m.backdrop_url,
          tmdb_id: m.tmdb_id,
          tmdb_media_type: "movie",
          published: true,
        })) as Movie[];

        if (isKids) {
          // Simple client-side filter for demonstration.
          // In production, you'd filter by certification/rating from TMDB
          allMovies = allMovies.filter(
            (m) =>
              !m.title.toLowerCase().includes("horror") &&
              !m.title.toLowerCase().includes("dead") &&
              !m.title.toLowerCase().includes("evil"),
          );
        }

        if (allMovies.length > 0) return allMovies;
      } catch (e) {
        console.warn("TMDB popular failed", e);
      }

      // Fallback to Supabase if TMDB is completely unavailable
      let query = supabase
        .from("movies")
        .select(
          "id,title,description,release_year,rating,genres,poster_url,backdrop_url,tmdb_id,tmdb_media_type,trailer_url",
        )
        .eq("published", true);

      if (isKids) {
        // Filter for PG or G ratings if they exist
        query = query.in("rating", ["G", "PG", "TV-Y7", "TV-G"]);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(60);

      if (error) {
        console.error("Supabase fallback failed", error);
        return [];
      }
      return data ?? [];
    },
  });

  const movies: Movie[] = data ?? [];
  const hero = movies.find((m) => m.backdrop_url) ?? movies[0];
  const trending = movies.slice(0, 12);
  const popular = movies.slice(12, 24);
  const newReleases = [...movies]
    .sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0))
    .slice(0, 12);

  const [openHeroTrailer, setOpenHeroTrailer] = useState(false);
  const [heroTrailerUrl, setHeroTrailerUrl] = useState<string | null | undefined>(undefined);
  const [showAutoplay, setShowAutoplay] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (hero) {
      // Fetch trailer URL for autoplay if not present
      const fetchTrailer = async () => {
        if (!heroTrailerUrl && hero.tmdb_id) {
          try {
            const mediaType = hero.tmdb_media_type ?? "movie";
            const res = await fetch(
              `/api/tmdb/movie/${encodeURIComponent(String(hero.tmdb_id))}?mediaType=${encodeURIComponent(mediaType)}`,
            );
            if (res.ok) {
              const j = await res.json();
              setHeroTrailerUrl(j.trailer_url ?? null);
            }
          } catch (e) {
            // ignore
          }
        }
      };
      fetchTrailer();

      timer = setTimeout(() => {
        setShowAutoplay(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [hero, heroTrailerUrl]);

  async function handleOpenHeroTrailer() {
    if (!hero) return;
    if (!heroTrailerUrl && hero.tmdb_id) {
      try {
        const mediaType = hero.tmdb_media_type ?? "movie";
        const res = await fetch(
          `/api/tmdb/movie/${encodeURIComponent(String(hero.tmdb_id))}?mediaType=${encodeURIComponent(mediaType)}`,
        );
        if (res.ok) {
          const j = await res.json();
          setHeroTrailerUrl(j.trailer_url ?? null);
        }
      } catch (e) {
        // ignore
      }
    } else {
      setHeroTrailerUrl(hero.trailer_url ?? null);
    }
    setOpenHeroTrailer(true);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative h-screen min-h-[800px] flex items-center overflow-hidden bg-background">
        {showAutoplay && heroTrailerUrl ? (
          <div className="absolute inset-0 w-full h-full animate-in fade-in duration-1000">
            <iframe
              src={`${heroTrailerUrl}${heroTrailerUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playlist=${heroTrailerUrl.split("/").pop()?.split("?")[0]}`}
              className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none grayscale opacity-40 mix-blend-luminosity"
              allow="autoplay; encrypted-media"
            />
          </div>
        ) : (
          <>
            {hero?.backdrop_url ? (
              <img
                src={hero.backdrop_url}
                alt={hero.title}
                className={`absolute inset-0 w-full h-full object-cover grayscale opacity-40 mix-blend-luminosity animate-in fade-in zoom-in-110 duration-1000 ${isKids ? "grayscale-0 opacity-60 mix-blend-normal" : ""}`}
              />
            ) : (
              <div className="absolute inset-0 bg-surface-2" />
            )}
          </>
        )}

        <div className="absolute inset-0 gradient-overlay-hero opacity-80" />
        <div className="absolute inset-0 gradient-fade-bottom" />

        <div className="relative max-w-[2400px] mx-auto w-full px-6 md:px-12 py-32 mt-20">
          <div className="animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-300">
            <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary mb-8 flex items-center gap-4">
              <span className="h-[1px] w-12 bg-primary" />
              {isKids ? "JUNIOR_EXPLORER_ACCESS" : "U_ORIGINAL_PRODUCTION"}
            </div>

            <h1 className="font-display text-[12vw] md:text-[15vw] leading-[0.75] tracking-tighter text-foreground mb-12 mix-blend-difference select-none">
              {hero?.title?.split(" ").map((word, i) => (
                <span key={i} className="block last:italic last:text-primary">
                  {word}
                </span>
              ))}
            </h1>

            <div className="grid md:grid-cols-2 gap-12 items-end">
              <div className="max-w-xl">
                <p className="text-xl md:text-2xl text-foreground/60 leading-tight mb-12 font-light">
                  {hero?.description ??
                    (isKids
                      ? "Discover amazing stories and adventures made just for you."
                      : "Exploring the boundaries of digital cinema in Uganda. A visceral streaming experience.")}
                </p>

                <div className="flex flex-wrap gap-8">
                  {hero ? (
                    <>
                      {user ? (
                        <Link to="/movie/$id" params={{ id: hero.id }} search={{ play: true }}>
                          <button className="magnetic-btn border border-foreground px-12 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors flex items-center gap-4 group">
                            <Play className="size-4 fill-current group-hover:scale-125 transition-transform" />{" "}
                            {isKids ? "START_ADVENTURE" : "START_EXPERIENCE"}
                          </button>
                        </Link>
                      ) : (
                        <Link to="/login">
                          <button className="magnetic-btn bg-primary text-white px-12 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-foreground transition-colors">
                            Initiate_Session
                          </button>
                        </Link>
                      )}
                    </>
                  ) : null}

                  {hero && (
                    <Link to="/movie/$id" params={{ id: hero.id }}>
                      <button className="magnetic-btn border border-foreground/20 px-12 py-6 rounded-none font-mono text-[11px] uppercase tracking-widest hover:border-foreground transition-colors">
                        {isKids ? "SEE_DETAILS" : "METADATA_ARCHIVE"}
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="hidden md:block text-right">
                <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground/40 space-y-2">
                  <p>CODE_SOURCE: {isKids ? "KIDS_SAFE_STREAM" : "TMDB_API_V3"}</p>
                  <p>COORDINATES: 0.3476° N, 32.5825° E</p>
                  <p>ENCODING: 4K_UHD_HDR</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <div className="font-mono text-[8px] uppercase tracking-[0.5em] text-foreground/30 animate-pulse">
            {isKids ? "SCROLL_FOR_FUN" : "SCROLL_TO_EXPLORE"}
          </div>
          <div className="w-[1px] h-24 bg-gradient-to-b from-primary to-transparent" />
        </div>
      </section>

      {/* Rows */}
      <main className="space-y-32 relative z-10 pb-40">
        {user && <ContinueWatchingRow />}
        {user && !isKids && <MyListRow />}
        {!isLoading && !movies.length && (
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="font-display text-3xl mb-2">
              {isKids ? "More fun coming soon!" : "No movies yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isKids
                ? "We're adding new cartoons and adventures every day."
                : "An admin needs to add the first titles. Sign in and visit the admin panel."}
            </p>
            {!isKids && (
              <Link to="/admin">
                <Button>Go to admin</Button>
              </Link>
            )}
          </div>
        )}
        <MovieRow
          title={isKids ? "Super Stories" : "Trending Now"}
          movies={trending}
          isLoading={isLoading}
        />

        {/* Top 10 Row */}
        {!isKids && (
          <section className="space-y-12">
            <div className="flex items-center gap-4 px-4 md:px-10">
              <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter italic">
                Top 10_Now
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
            <div className="flex gap-12 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-8">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="shrink-0 w-[240px] aspect-[2/3] bg-surface-2 animate-pulse"
                    />
                  ))
                : movies.slice(0, 10).map((m, i) => (
                    <div key={m.id} className="group relative shrink-0 flex items-end">
                      <span
                        className="absolute -left-8 -bottom-4 font-display text-[180px] leading-[0.7] text-transparent stroke-primary/30 stroke-2 group-hover:stroke-primary transition-all duration-700 select-none z-0"
                        style={{ WebkitTextStroke: "2px var(--color-primary)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="relative z-10 ml-8 transform group-hover:-translate-y-4 transition-transform duration-500">
                        <MovieCard movie={m} />
                      </div>
                    </div>
                  ))}
            </div>
          </section>
        )}

        <MovieRow
          title={isKids ? "Newly Added" : "New Releases"}
          movies={newReleases}
          isLoading={isLoading}
        />
        <MovieRow
          title={isKids ? "Everyone's Watching" : "Popular on U Stream"}
          movies={popular}
          isLoading={isLoading}
        />
      </main>

      <SiteFooter />

      <TrailerModal
        open={openHeroTrailer}
        onOpenChange={setOpenHeroTrailer}
        trailerUrl={heroTrailerUrl ?? hero?.trailer_url}
        title={hero?.title}
      />
    </div>
  );
}
