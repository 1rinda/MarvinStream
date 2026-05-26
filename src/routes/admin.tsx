import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — U Stream" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["admin", "movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movie deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "movies"] });
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-4xl mb-2">Admin only</h1>
          <p className="text-muted-foreground mb-4">
            Your account doesn't have admin access. Promote a user by adding a row to the{" "}
            <code className="bg-surface-2 px-1 rounded">user_roles</code> table with role ={" "}
            <code className="bg-surface-2 px-1 rounded">admin</code>.
          </p>
          <Link to="/" className="text-primary">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[1400px] mx-auto px-4 md:px-10 pb-20">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl">Movie Library</h1>
            <p className="text-muted-foreground text-sm">Manage U Stream's catalog</p>
          </div>
          <Link to="/admin/movies/new">
            <Button className="gap-2">
              <Plus className="size-4" /> Add movie
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : movies.length === 0 ? (
          <div className="border border-dashed border-border rounded-md p-16 text-center">
            <h2 className="font-display text-2xl mb-2">No movies yet</h2>
            <p className="text-muted-foreground mb-4">Add your first title to get started.</p>
            <Link to="/admin/movies/new">
              <Button>Add movie</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-3">Poster</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Video</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-surface-2/40">
                    <td className="p-3">
                      {m.poster_url ? (
                        <img src={m.poster_url} alt="" className="w-10 h-14 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-14 bg-surface-3 rounded" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium flex items-center gap-2">
                        {m.title}{" "}
                        {m.featured && <Star className="size-3 fill-primary text-primary" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.genres?.join(", ")}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{m.release_year ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${m.published ? "bg-accent/20 text-accent" : "bg-surface-3 text-muted-foreground"}`}
                      >
                        {m.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{m.video_url ? "✓" : "—"}</td>
                    <td className="p-3 text-right space-x-1">
                      <Link to="/admin/movies/$id" params={{ id: m.id }}>
                        <Button size="sm" variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${m.title}"?`)) del.mutate(m.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
