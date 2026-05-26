import type {
  TmdbMediaType,
  TmdbMovieDetails,
  TmdbProviderRegion,
  TmdbSearchResult,
} from "@/integrations/tmdb/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function buildFetchOptions() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  return {
    token,
    apiKey,
    withAuth(url: string) {
      return {
        url: token ? url : `${url}${url.includes("?") ? "&" : "?"}api_key=${apiKey}`,
        headers: token
          ? ({ Authorization: `Bearer ${token}` } as Record<string, string>)
          : undefined,
      };
    },
  };
}

function getImageUrl(size: "w500" | "w780" | "w1280", path?: string | null) {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

function extractTrailerUrl(data: TmdbMovieDetails) {
  const trailer = data.videos?.results?.find(
    (video) => video.site === "YouTube" && video.type === "Trailer" && video.key,
  );
  return trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function detectMediaType(data: TmdbMovieDetails, mediaType?: TmdbMediaType): TmdbMediaType {
  if (mediaType) return mediaType;
  return data.name || data.first_air_date || data.number_of_seasons ? "tv" : "movie";
}

function normalizeProviders(
  details: TmdbMovieDetails,
): Record<string, TmdbProviderRegion> | undefined {
  return details["watch/providers"]?.results;
}

export async function getTmdbDetails(tmdbId: string, mediaType: TmdbMediaType = "movie") {
  if (!tmdbId) throw new Error("Missing TMDB id");

  const { withAuth } = buildFetchOptions();
  const base = `${TMDB_BASE}/${mediaType}/${encodeURIComponent(tmdbId)}`;
  const { url, headers } = withAuth(
    `${base}?language=en-US&append_to_response=videos,images,credits,reviews,watch/providers,release_dates,content_ratings`,
  );
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);

  const data = (await res.json()) as TmdbMovieDetails;
  const normalizedType = detectMediaType(data, mediaType);

  return {
    ...data,
    media_type: normalizedType,
    poster_url: getImageUrl("w500", data.poster_path),
    backdrop_url: getImageUrl("w1280", data.backdrop_path),
    trailer_url: extractTrailerUrl(data),
    watch_providers: normalizeProviders(data),
  };
}

export async function getMovie(tmdbId: string, mediaType: TmdbMediaType = "movie") {
  return getTmdbDetails(tmdbId, mediaType);
}

export async function searchTmdbTitles(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { withAuth } = buildFetchOptions();
  const { url, headers } = withAuth(
    `${TMDB_BASE}/search/multi?language=en-US&include_adult=false&query=${encodeURIComponent(trimmed)}`,
  );
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);

  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, 10)
    .map((item) => {
      const mediaType = item.media_type as TmdbMediaType;
      const title =
        typeof item.title === "string"
          ? item.title
          : typeof item.name === "string"
            ? item.name
            : "";

      return {
        tmdb_id: String(item.id ?? ""),
        media_type: mediaType,
        title,
        overview: typeof item.overview === "string" ? item.overview : null,
        poster_url: getImageUrl("w500", item.poster_path as string | null | undefined),
        backdrop_url: getImageUrl("w780", item.backdrop_path as string | null | undefined),
        release_date:
          typeof item.release_date === "string"
            ? item.release_date
            : typeof item.first_air_date === "string"
              ? item.first_air_date
              : null,
        vote_average: typeof item.vote_average === "number" ? item.vote_average : null,
      } satisfies TmdbSearchResult;
    });
}
