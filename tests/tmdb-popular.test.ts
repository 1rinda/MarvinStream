import test from "node:test";
import assert from "node:assert/strict";
import {
  clearPopularCache,
  getCachedPopularResponse,
  normalizePopularResponse,
} from "../src/integrations/tmdb/popular.server.ts";

test("normalizePopularResponse maps TMDB payload into app shape", () => {
  const normalized = normalizePopularResponse({
    page: 3,
    total_pages: 20,
    results: [
      {
        id: 550,
        title: "Fight Club",
        overview: "desc",
        poster_path: "/poster.jpg",
        backdrop_path: "/backdrop.jpg",
        release_date: "1999-10-15",
        vote_average: 8.4,
      },
    ],
  });

  assert.deepEqual(normalized, {
    page: 3,
    total_pages: 20,
    results: [
      {
        tmdb_id: "550",
        title: "Fight Club",
        overview: "desc",
        poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
        backdrop_url: "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
        release_date: "1999-10-15",
        vote_average: 8.4,
      },
    ],
  });
});

test("getCachedPopularResponse reuses cached payload within TTL", async () => {
  clearPopularCache();

  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return {
      page: 1,
      total_pages: 1,
      results: [{ id: 1, title: "Cached" }],
    };
  };

  const first = await getCachedPopularResponse(1, fetcher, 1000);
  const second = await getCachedPopularResponse(1, fetcher, 1001);

  assert.equal(calls, 1);
  assert.deepEqual(second, first);
});
