import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { MovieForm } from "@/components/movie-form";

export const Route = createFileRoute("/admin/movies/new")({
  head: () => ({ meta: [{ title: "New movie — U Stream Admin" }] }),
  component: NewMovie,
});

function NewMovie() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) return null;
  if (!isAdmin)
    return <div className="min-h-screen flex items-center justify-center">Admin only.</div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[1400px] mx-auto px-4 md:px-10 pb-20">
        <h1 className="font-display text-4xl md:text-5xl mb-6">Add movie</h1>
        <MovieForm />
      </main>
    </div>
  );
}
