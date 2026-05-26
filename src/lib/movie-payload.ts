export type MovieFormState = {
  title: string;
  description: string | null;
  release_year: number | null;
  duration_minutes: number | null;
  rating: string | null;
  genres: string[];
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id?: string | null;
  tmdb_media_type?: string | null;
  trailer_url: string | null;
  video_url: string | null;
  featured: boolean;
  published: boolean;
};

export function buildMoviePayload(movie: MovieFormState, genresText: string) {
  return {
    ...movie,
    genres: genresText
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean),
    release_year: movie.release_year ? Number(movie.release_year) : null,
    duration_minutes: movie.duration_minutes ? Number(movie.duration_minutes) : null,
  };
}
