import type { TmdbPopularMovie, TmdbPopularResponse } from "@/integrations/tmdb/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const POPULAR_CACHE_TTL_MS = 15 * 60 * 1000;

type PopularCacheEntry = {
  expiresAt: number;
  data: TmdbPopularResponse;
};

const popularCache = new Map<number, PopularCacheEntry>();

export function normalizePopularMovie(movie: Record<string, unknown>): TmdbPopularMovie {
  const tmdbId = movie.id;
  const posterPath = typeof movie.poster_path === "string" ? movie.poster_path : null;
  const backdropPath = typeof movie.backdrop_path === "string" ? movie.backdrop_path : null;
  const genreIds = Array.isArray(movie.genre_ids) ? (movie.genre_ids as number[]) : [];

  return {
    tmdb_id: String(tmdbId ?? ""),
    title: typeof movie.title === "string" ? movie.title : "",
    overview: typeof movie.overview === "string" ? movie.overview : null,
    poster_url: posterPath ? `${TMDB_IMAGE_BASE}/w500${posterPath}` : null,
    backdrop_url: backdropPath ? `${TMDB_IMAGE_BASE}/w1280${backdropPath}` : null,
    release_date: typeof movie.release_date === "string" ? movie.release_date : null,
    vote_average: typeof movie.vote_average === "number" ? movie.vote_average : null,
    genre_ids: genreIds,
  };
}

export function normalizePopularResponse(payload: Record<string, unknown>): TmdbPopularResponse {
  const page = typeof payload.page === "number" ? payload.page : 1;
  const totalPages = typeof payload.total_pages === "number" ? payload.total_pages : 1;
  const rawResults = Array.isArray(payload.results) ? payload.results : [];

  return {
    page,
    total_pages: totalPages,
    results: rawResults.map((movie) => normalizePopularMovie(movie as Record<string, unknown>)),
  };
}

export async function getCachedPopularResponse(
  page: number,
  fetcher: (page: number) => Promise<Record<string, unknown>>,
  now = Date.now(),
): Promise<TmdbPopularResponse> {
  const cached = popularCache.get(page);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const payload = await fetcher(page);
  const normalized = normalizePopularResponse(payload);
  popularCache.set(page, {
    data: normalized,
    expiresAt: now + POPULAR_CACHE_TTL_MS,
  });

  return normalized;
}

export function clearPopularCache() {
  popularCache.clear();
}
