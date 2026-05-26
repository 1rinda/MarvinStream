import { createFileRoute } from "@tanstack/react-router";
import { searchTmdbTitles } from "@/integrations/tmdb/client.server";

export const Route = createFileRoute("/api/tmdb/search")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query") ?? "";

        try {
          const results = await searchTmdbTitles(query);
          return new Response(JSON.stringify(results), {
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
