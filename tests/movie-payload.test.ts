import test from "node:test";
import assert from "node:assert/strict";
import { buildMoviePayload } from "../src/lib/movie-payload.ts";

test("buildMoviePayload trims genres and preserves numeric nullable fields", () => {
  const payload = buildMoviePayload(
    {
      title: "Demo",
      description: "A movie",
      release_year: 2026,
      duration_minutes: 140,
      rating: "PG-13",
      genres: [],
      poster_url: null,
      backdrop_url: null,
      trailer_url: null,
      video_url: null,
      featured: false,
      published: true,
    },
    " Action, Drama , ,Sci-Fi ",
  );

  assert.deepEqual(payload.genres, ["Action", "Drama", "Sci-Fi"]);
  assert.equal(payload.release_year, 2026);
  assert.equal(payload.duration_minutes, 140);
});

test("buildMoviePayload converts empty numeric values to null", () => {
  const payload = buildMoviePayload(
    {
      title: "Demo",
      description: null,
      release_year: null,
      duration_minutes: null,
      rating: null,
      genres: [],
      poster_url: null,
      backdrop_url: null,
      trailer_url: null,
      video_url: null,
      featured: false,
      published: false,
    },
    "",
  );

  assert.equal(payload.release_year, null);
  assert.equal(payload.duration_minutes, null);
  assert.deepEqual(payload.genres, []);
});
