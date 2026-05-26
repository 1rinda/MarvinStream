import type { TmdbMediaType, TmdbMovieDetails, TmdbSearchResult } from "@/integrations/tmdb/types";

export async function fetchTmdbMovie(tmdbId: string, mediaType: TmdbMediaType = "movie") {
  if (!tmdbId) throw new Error("Missing TMDB id");
  const res = await fetch(
    `/api/tmdb/movie/${encodeURIComponent(tmdbId)}?mediaType=${encodeURIComponent(mediaType)}`,
  );
  if (!res.ok) throw new Error("TMDB proxy request failed");
  return (await res.json()) as TmdbMovieDetails;
}

export async function searchTmdbTitles(query: string) {
  const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("TMDB search request failed");
  return (await res.json()) as TmdbSearchResult[];
}
