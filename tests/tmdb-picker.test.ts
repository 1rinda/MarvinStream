import test from "node:test";
import assert from "node:assert/strict";
import {
  getTmdbCertification,
  mapTmdbDetailsToMovieForm,
  summarizeProviderRegion,
} from "../src/integrations/tmdb/picker.ts";

test("mapTmdbDetailsToMovieForm maps rich TMDB details into form state", () => {
  const payload = mapTmdbDetailsToMovieForm({
    id: 42,
    media_type: "tv",
    name: "Example Series",
    overview: "Overview",
    first_air_date: "2024-01-02",
    episode_run_time: [52],
    vote_average: 8.6,
    genres: [{ name: "Drama" }, { name: "Thriller" }],
    poster_url: "poster",
    backdrop_url: "backdrop",
    trailer_url: "trailer",
  });

  assert.equal(payload.title, "Example Series");
  assert.equal(payload.release_year, 2024);
  assert.equal(payload.duration_minutes, 52);
  assert.equal(payload.tmdb_id, "42");
  assert.equal(payload.tmdb_media_type, "tv");
  assert.deepEqual(payload.genres, ["Drama", "Thriller"]);
});

test("getTmdbCertification prefers country-specific certification data", () => {
  const certification = getTmdbCertification({
    release_dates: {
      results: [
        { iso_3166_1: "US", release_dates: [{ certification: "PG-13" }] },
        { iso_3166_1: "UG", release_dates: [{ certification: "16" }] },
      ],
    },
  });

  assert.equal(certification, "16");
});

test("summarizeProviderRegion flattens stream, rent, and buy providers", () => {
  const providers = summarizeProviderRegion({
    flatrate: [{ provider_name: "Netflix" }],
    rent: [{ provider_name: "Prime Video" }],
    buy: [{ provider_name: "Apple TV" }],
  });

  assert.deepEqual(providers, [
    { type: "Stream", name: "Netflix" },
    { type: "Rent", name: "Prime Video" },
    { type: "Buy", name: "Apple TV" },
  ]);
});
