import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useState, useEffect } from "react";

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_kids: boolean;
};

export function useProfiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_profile");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["user-profiles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProfile = useMutation({
    mutationFn: async ({
      name,
      avatarUrl,
      isKids = false,
    }: {
      name: string;
      avatarUrl?: string;
      isKids?: boolean;
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          display_name: name,
          avatar_url: avatarUrl,
          is_kids: isKids,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles", user?.id] });
    },
  });

  const selectProfile = (profile: UserProfile) => {
    setActiveProfile(profile);
    localStorage.setItem("active_profile", JSON.stringify(profile));
  };

  const clearProfile = () => {
    setActiveProfile(null);
    localStorage.removeItem("active_profile");
  };

  return {
    profiles,
    activeProfile,
    isLoading,
    createProfile: createProfile.mutate,
    isCreating: createProfile.isPending,
    selectProfile,
    clearProfile,
  };
}
