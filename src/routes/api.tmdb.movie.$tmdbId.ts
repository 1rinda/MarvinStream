import { createFileRoute } from "@tanstack/react-router";
import { getMovie } from "@/integrations/tmdb/client.server";
import type { TmdbMediaType } from "@/integrations/tmdb/types";

export const Route = createFileRoute("/api/tmdb/movie/$tmdbId")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { tmdbId?: string }; request: Request }) => {
        const tmdbId = params?.tmdbId ?? new URL(request.url).pathname.split("/").pop();
        const mediaType = new URL(request.url).searchParams.get("mediaType");
        if (!tmdbId) return new Response("Missing tmdb id", { status: 400 });
        try {
          const data = await getMovie(
            tmdbId,
            mediaType === "tv" || mediaType === "movie" ? (mediaType as TmdbMediaType) : "movie",
          );
          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, s-maxage=3600",
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
