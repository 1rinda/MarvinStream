import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles, type UserProfile } from "@/hooks/use-profiles";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, User, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Cleo",
];

function ProfilesPage() {
  const { user, loading: authLoading } = useAuth();
  const { profiles, selectProfile, createProfile, isLoading: profilesLoading } = useProfiles();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [isKids, setIsKids] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  const handleSelect = (p: UserProfile) => {
    selectProfile(p);
    navigate({ to: "/" });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createProfile({
      name: newName,
      isKids,
      avatarUrl: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    });
    setNewName("");
    setShowAdd(false);
  };

  if (authLoading || profilesLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <h1 className="font-display text-5xl md:text-6xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          Who's watching?
        </h1>

        <div className="flex flex-wrap justify-center gap-8 mb-16">
          {profiles.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="group flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="relative size-32 md:size-40 rounded-md overflow-hidden ring-4 ring-transparent group-hover:ring-white transition-all duration-300 shadow-2xl">
                <img
                  src={p.avatar_url || AVATARS[0]}
                  alt={p.display_name ?? ""}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                {p.is_kids && (
                  <div className="absolute bottom-2 right-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                    KIDS
                  </div>
                )}
              </div>
              <span className="text-muted-foreground group-hover:text-white text-xl md:text-2xl font-medium transition-colors">
                {p.display_name}
              </span>
            </button>
          ))}

          {profiles.length < 5 && (
            <button
              onClick={() => setShowAdd(true)}
              className="group flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${profiles.length * 100}ms` }}
            >
              <div className="size-32 md:size-40 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border-2 border-dashed border-white/20">
                <Plus className="size-16 text-muted-foreground group-hover:text-white transition-colors" />
              </div>
              <span className="text-muted-foreground group-hover:text-white text-xl md:text-2xl font-medium transition-colors">
                Add Profile
              </span>
            </button>
          )}
        </div>

        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="max-w-sm mx-auto p-8 glass rounded-xl animate-in zoom-in-95 fade-in duration-300"
          >
            <h3 className="text-2xl font-display mb-6">New Profile</h3>
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white/5 border-white/10 h-12 mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3 mb-8 justify-center">
              <input
                type="checkbox"
                id="kids"
                checked={isKids}
                onChange={(e) => setIsKids(e.target.checked)}
                className="size-5 rounded border-white/10 bg-white/5 text-primary accent-primary"
              />
              <label htmlFor="kids" className="text-sm font-medium">
                This is a Kids profile
              </label>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-full shadow-glow">
                Create
              </Button>
            </div>
          </form>
        )}

        {!showAdd && (
          <Button
            variant="outline"
            className="border-white/20 text-muted-foreground hover:text-white hover:border-white px-10 rounded-full text-sm uppercase tracking-[0.2em]"
          >
            Manage Profiles
          </Button>
        )}
      </div>
    </div>
  );
}
