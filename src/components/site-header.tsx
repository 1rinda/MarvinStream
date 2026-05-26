import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Search, Shield, LogOut, Sun, Moon, UserCircle, X, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useProfiles } from "@/hooks/use-profiles";
import { useQuery } from "@tanstack/react-query";
import type { TmdbSearchResult } from "@/integrations/tmdb/types";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeProfile } = useProfiles();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading: isSearching } = useQuery({
    queryKey: ["tmdb", "predictive-search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      const data = (await res.json()) as TmdbSearchResult[];
      return data.slice(0, 5); // Just top 5 for predictive
    },
    enabled: searchQuery.length >= 2,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/browse", search: { q: searchQuery } });
      setIsSearchOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-background/90 backdrop-blur-3xl border-b border-foreground/10 py-4"
          : "py-8 bg-gradient-to-b from-background/40 to-transparent"
      }`}
    >
      <div className="max-w-[2400px] mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="group relative">
            <span className="font-display text-4xl md:text-5xl tracking-tighter leading-none block group-hover:scale-x-110 transition-transform origin-left">
              U<span className="text-primary italic">.</span>STREAM
            </span>
            <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-right" />
          </Link>

          <nav className="hidden lg:flex items-center gap-12 font-mono text-[11px] uppercase tracking-[0.3em] font-bold">
            <Link
              to="/"
              className="hover:text-primary transition-colors relative py-1"
              activeOptions={{ exact: true }}
              activeProps={{
                className:
                  "text-primary after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary",
              }}
            >
              01/Home
            </Link>
            {user && (
              <>
                <Link
                  to="/browse"
                  className="hover:text-primary transition-colors relative py-1"
                  activeProps={{
                    className:
                      "text-primary after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary",
                  }}
                >
                  02/Browse
                </Link>
                <Link
                  to="/plans"
                  className="hover:text-primary transition-colors relative py-1"
                  activeProps={{
                    className:
                      "text-primary after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary",
                  }}
                >
                  03/Pricing
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {user && (
            <div className="relative">
              {isSearchOpen ? (
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300"
                >
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type to find..."
                      className="bg-foreground/5 border border-foreground/10 px-4 py-2 text-sm font-mono focus:outline-none focus:border-primary/50 w-[200px] md:w-[300px]"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3 animate-spin text-primary" />
                    )}

                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-foreground/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {suggestions.map((s) => (
                          <Link
                            key={s.tmdb_id}
                            to="/movie/$id"
                            params={{ id: `tmdb-${s.tmdb_id}` }}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center gap-4 p-3 hover:bg-foreground/5 transition-colors group"
                          >
                            <img
                              src={s.poster_url || ""}
                              alt=""
                              className="size-10 object-cover grayscale group-hover:grayscale-0 transition-all"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-[10px] uppercase truncate">{s.title}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {s.release_date?.slice(0, 4)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
                    <X className="size-5" />
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="magnetic-btn hover:bg-foreground/5 rounded-none border border-transparent hover:border-foreground/10"
                >
                  <Search className="size-5" />
                </Button>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="magnetic-btn hover:bg-foreground/5 rounded-none border border-transparent hover:border-foreground/10"
          >
            {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profiles" className="magnetic-btn">
                {activeProfile?.avatar_url ? (
                  <img
                    src={activeProfile.avatar_url}
                    alt={activeProfile.display_name ?? ""}
                    className="size-10 grayscale hover:grayscale-0 transition-all border border-foreground/20"
                  />
                ) : (
                  <UserCircle className="size-10 text-muted-foreground" />
                )}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("active_profile");
                  signOut();
                }}
                className="magnetic-btn hidden md:flex rounded-none border-foreground/20 font-mono text-[10px] tracking-widest uppercase hover:bg-primary hover:text-white hover:border-primary px-6"
              >
                Exit_Portal
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/login" })}
                className="font-mono text-[10px] tracking-widest uppercase hover:text-primary"
              >
                Login
              </Button>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/signup" })}
                className="magnetic-btn bg-primary text-white rounded-none font-mono text-[10px] tracking-[0.2em] uppercase px-8 py-6 h-auto hover:bg-foreground hover:text-background transition-colors"
              >
                Join_The_Cult
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
