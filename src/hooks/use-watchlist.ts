import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export function useWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("watchlists")
        .select("id, movie_id, tmdb_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ movieId, tmdbId }: { movieId?: string; tmdbId?: string }) => {
      if (!user) throw new Error("Must be logged in");

      const existing = watchlist.find(
        (w) => (movieId && w.movie_id === movieId) || (tmdbId && w.tmdb_id === tmdbId),
      );

      if (existing) {
        const { error } = await supabase.from("watchlists").delete().eq("id", existing.id);
        if (error) throw error;
        return { action: "removed" };
      } else {
        const { error } = await supabase.from("watchlists").insert({
          user_id: user.id,
          movie_id: movieId,
          tmdb_id: tmdbId,
        });
        if (error) throw error;
        return { action: "added" };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
      toast.success(data.action === "added" ? "Added to My List" : "Removed from My List");
    },
    onError: (error) => {
      toast.error("Failed to update watchlist");
      console.error(error);
    },
  });

  const inWatchlist = (movieId?: string, tmdbId?: string) => {
    return watchlist.some(
      (w) => (movieId && w.movie_id === movieId) || (tmdbId && w.tmdb_id === tmdbId),
    );
  };

  return {
    watchlist,
    isLoading,
    toggleWatchlist: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    inWatchlist,
  };
}
