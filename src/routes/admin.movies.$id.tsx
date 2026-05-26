import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { MovieForm } from "@/components/movie-form";

export const Route = createFileRoute("/admin/movies/$id")({
  head: () => ({ meta: [{ title: "Edit movie — U Stream Admin" }] }),
  component: EditMovie,
});

function EditMovie() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "movie", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  if (loading || isLoading || !user) return null;
  if (!isAdmin)
    return <div className="min-h-screen flex items-center justify-center">Admin only.</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Not found.</div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[1400px] mx-auto px-4 md:px-10 pb-20">
        <h1 className="font-display text-4xl md:text-5xl mb-6">Edit movie</h1>
        <MovieForm initial={{ ...data, id: data.id }} />
      </main>
    </div>
  );
}
