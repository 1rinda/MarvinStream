import { createFileRoute } from "@tanstack/react-router";
import { getCachedPopularResponse } from "@/integrations/tmdb/popular.server";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function fetchPopularFromTmdb(page = 1) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  const url = `${TMDB_BASE}/movie/popular?language=en-US&page=${page}`;
  const fetchUrl = token ? url : `${url}&api_key=${apiKey}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await fetch(fetchUrl, { headers });
  if (!res.ok) throw new Error(`TMDB popular fetch failed: ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export const Route = createFileRoute("/api/tmdb/popular")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
        try {
          const data = await getCachedPopularResponse(page, fetchPopularFromTmdb);
          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
            },
          });
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
