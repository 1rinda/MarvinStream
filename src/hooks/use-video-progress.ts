import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useVideoProgress(movieId?: string, tmdbId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ["video-progress", user?.id, movieId, tmdbId],
    queryFn: async () => {
      if (!user) return null;
      const query = supabase.from("video_progress").select("*").eq("user_id", user.id);

      if (movieId) query.eq("movie_id", movieId);
      else if (tmdbId) query.eq("tmdb_id", tmdbId);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && (!!movieId || !!tmdbId),
  });

  const saveProgress = useMutation({
    mutationFn: async ({
      lastPosition,
      duration,
      finished = false,
    }: {
      lastPosition: number;
      duration: number;
      finished?: boolean;
    }) => {
      if (!user) return;

      const { error } = await supabase.from("video_progress").upsert(
        {
          user_id: user.id,
          movie_id: movieId,
          tmdb_id: tmdbId,
          last_position_seconds: lastPosition,
          duration_seconds: duration,
          is_finished: finished,
        },
        { onConflict: "user_id, movie_id" }, // Simplification; should handle TMDB too
      );

      if (error) throw error;
    },
  });

  return {
    progress,
    saveProgress: saveProgress.mutate,
  };
}
