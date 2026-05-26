export type TmdbMediaType = "movie" | "tv";

export type TmdbPopularMovie = {
  tmdb_id: string;
  title: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  vote_average: number | null;
  genre_ids?: number[];
};

export type TmdbPopularResponse = {
  page: number;
  total_pages: number;
  results: TmdbPopularMovie[];
};

export type TmdbMovieGenre = {
  id?: number;
  name: string;
};

export type TmdbMovieVideo = {
  key?: string;
  site?: string;
  type?: string;
};

export type TmdbCreditPerson = {
  id?: number;
  name?: string;
  character?: string;
  job?: string;
  department?: string;
  profile_path?: string | null;
};

export type TmdbReview = {
  id?: string;
  author?: string;
  content?: string;
  created_at?: string;
  url?: string;
};

export type TmdbSeason = {
  id?: number;
  name?: string;
  season_number?: number;
  episode_count?: number;
  air_date?: string | null;
};

export type TmdbProviderRegion = {
  link?: string;
  flatrate?: Array<{ provider_name?: string; logo_path?: string | null }>;
  rent?: Array<{ provider_name?: string; logo_path?: string | null }>;
  buy?: Array<{ provider_name?: string; logo_path?: string | null }>;
};

export type TmdbMovieDetails = Record<string, unknown> & {
  id?: number;
  media_type?: TmdbMediaType;
  title?: string;
  name?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  genres?: TmdbMovieGenre[];
  seasons?: TmdbSeason[];
  videos?: {
    results?: TmdbMovieVideo[];
  };
  credits?: {
    cast?: TmdbCreditPerson[];
    crew?: TmdbCreditPerson[];
  };
  aggregate_credits?: {
    cast?: TmdbCreditPerson[];
    crew?: TmdbCreditPerson[];
  };
  reviews?: {
    results?: TmdbReview[];
  };
  "watch/providers"?: {
    results?: Record<string, TmdbProviderRegion>;
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1?: string;
      release_dates?: Array<{ certification?: string }>;
    }>;
  };
  content_ratings?: {
    results?: Array<{ iso_3166_1?: string; rating?: string }>;
  };
  watch_providers?: Record<string, TmdbProviderRegion>;
  poster_url?: string | null;
  backdrop_url?: string | null;
  trailer_url?: string | null;
};

export type TmdbSearchResult = {
  tmdb_id: string;
  media_type: TmdbMediaType;
  title: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  vote_average: number | null;
};
