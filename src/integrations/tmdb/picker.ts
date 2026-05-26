import type { TmdbMovieDetails, TmdbProviderRegion } from "@/integrations/tmdb/types";
import type { MovieFormState } from "@/lib/movie-payload";

export function getTmdbTitle(details: TmdbMovieDetails) {
  return details.title ?? details.name ?? "";
}

export function getTmdbReleaseYear(details: TmdbMovieDetails) {
  const date = details.release_date ?? details.first_air_date;
  return date ? Number.parseInt(date.slice(0, 4), 10) : null;
}

export function getTmdbDuration(details: TmdbMovieDetails) {
  if (typeof details.runtime === "number") return details.runtime;
  const episodeRunTime = details.episode_run_time?.[0];
  return typeof episodeRunTime === "number" ? episodeRunTime : null;
}

export function getTmdbCertification(details: TmdbMovieDetails) {
  const ugMovie = details.release_dates?.results?.find((result) => result.iso_3166_1 === "UG");
  const usMovie = details.release_dates?.results?.find((result) => result.iso_3166_1 === "US");
  const ugTv = details.content_ratings?.results?.find((result) => result.iso_3166_1 === "UG");
  const usTv = details.content_ratings?.results?.find((result) => result.iso_3166_1 === "US");

  return (
    ugMovie?.release_dates?.find((entry) => entry.certification)?.certification ??
    usMovie?.release_dates?.find((entry) => entry.certification)?.certification ??
    ugTv?.rating ??
    usTv?.rating ??
    null
  );
}

export function mapTmdbDetailsToMovieForm(details: TmdbMovieDetails): Partial<MovieFormState> {
  return {
    title: getTmdbTitle(details),
    description: details.overview ?? "",
    release_year: getTmdbReleaseYear(details),
    duration_minutes: getTmdbDuration(details),
    rating:
      getTmdbCertification(details) ??
      (details.vote_average ? details.vote_average.toFixed(1) : null),
    genres: details.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
    poster_url: details.poster_url ?? null,
    backdrop_url: details.backdrop_url ?? null,
    trailer_url: details.trailer_url ?? null,
    tmdb_id: details.id ? String(details.id) : null,
    tmdb_media_type: details.media_type ?? "movie",
  };
}

export function summarizeProviderRegion(region?: TmdbProviderRegion) {
  if (!region) return [];

  return [
    ...(region.flatrate ?? []).map((provider) => ({
      type: "Stream",
      name: provider.provider_name ?? "Unknown",
    })),
    ...(region.rent ?? []).map((provider) => ({
      type: "Rent",
      name: provider.provider_name ?? "Unknown",
    })),
    ...(region.buy ?? []).map((provider) => ({
      type: "Buy",
      name: provider.provider_name ?? "Unknown",
    })),
  ];
}
