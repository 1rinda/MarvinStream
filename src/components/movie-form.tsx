import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { compressVideo, formatBytes } from "@/lib/video-compress";
import { buildMoviePayload, type MovieFormState } from "@/lib/movie-payload";
import { searchTmdbTitles, fetchTmdbMovie } from "@/integrations/tmdb/client";
import {
  getTmdbCertification,
  getTmdbTitle,
  mapTmdbDetailsToMovieForm,
  summarizeProviderRegion,
} from "@/integrations/tmdb/picker";
import type { TmdbMovieDetails, TmdbSearchResult } from "@/integrations/tmdb/types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Upload, Loader2, Film, Search, Star, Tv } from "lucide-react";

type MovieRow = MovieFormState & {
  id?: string;
};

const empty: MovieRow = {
  title: "",
  description: "",
  release_year: new Date().getFullYear(),
  duration_minutes: null,
  rating: "PG",
  genres: [],
  poster_url: null,
  backdrop_url: null,
  tmdb_id: null,
  tmdb_media_type: null,
  trailer_url: null,
  video_url: null,
  featured: false,
  published: true,
};

export function MovieForm({ initial }: { initial?: MovieRow }) {
  const navigate = useNavigate();
  const [m, setM] = useState<MovieRow>(initial ?? empty);
  const [genresText, setGenresText] = useState((initial?.genres ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const [posterUploading, setPosterUploading] = useState(false);
  const [backdropUploading, setBackdropUploading] = useState(false);
  const [videoBusy, setVideoBusy] = useState<{
    phase: "idle" | "compressing" | "uploading";
    progress: number;
    original?: number;
    compressed?: number;
  }>({ phase: "idle", progress: 0 });
  const [maxHeight, setMaxHeight] = useState(720);
  const [crf, setCrf] = useState(28);

  const [tmdbQuery, setTmdbQuery] = useState(initial?.title ?? "");
  const deferredTmdbQuery = useDeferredValue(tmdbQuery);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([]);
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbMovieDetails | null>(null);
  const [tmdbLoadingId, setTmdbLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      const query = deferredTmdbQuery.trim();
      if (query.length < 2) {
        setTmdbResults([]);
        return;
      }

      setTmdbSearching(true);
      try {
        const results = await searchTmdbTitles(query);
        if (!cancelled) setTmdbResults(results);
      } catch (err) {
        if (!cancelled) {
          setTmdbResults([]);
          toast.error(err instanceof Error ? err.message : "TMDB search failed");
        }
      } finally {
        if (!cancelled) setTmdbSearching(false);
      }
    }

    void loadResults();
    return () => {
      cancelled = true;
    };
  }, [deferredTmdbQuery]);

  async function uploadImage(file: File, bucket: "posters" | "backdrops"): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function onPoster(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPosterUploading(true);
      const url = await uploadImage(file, "posters");
      setM({ ...m, poster_url: url });
      toast.success("Poster uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPosterUploading(false);
    }
  }

  async function onBackdrop(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBackdropUploading(true);
      const url = await uploadImage(file, "backdrops");
      setM({ ...m, backdrop_url: url });
      toast.success("Backdrop uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBackdropUploading(false);
    }
  }

  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setVideoBusy({ phase: "compressing", progress: 0, original: file.size });
      toast.info("Compressing video in your browser...", {
        description: "This may take a few minutes for large files.",
      });
      const compressed = await compressVideo(file, {
        maxHeight,
        crf,
        preset: "veryfast",
        onProgress: (r) => setVideoBusy((v) => ({ ...v, progress: r })),
      });
      setVideoBusy({
        phase: "uploading",
        progress: 1,
        original: file.size,
        compressed: compressed.size,
      });

      const path = `${crypto.randomUUID()}.mp4`;
      const { error } = await supabase.storage
        .from("videos")
        .upload(path, compressed, { contentType: "video/mp4" });
      if (error) throw error;
      const { data } = supabase.storage.from("videos").getPublicUrl(path);
      setM((prev) => ({ ...prev, video_url: data.publicUrl }));
      toast.success("Video uploaded", {
        description: `Compressed ${formatBytes(file.size)} -> ${formatBytes(compressed.size)}`,
      });
      setVideoBusy({
        phase: "idle",
        progress: 0,
        original: file.size,
        compressed: compressed.size,
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Video processing failed");
      setVideoBusy({ phase: "idle", progress: 0 });
    }
  }

  async function applyTmdbResult(result: TmdbSearchResult) {
    setTmdbLoadingId(result.tmdb_id);
    try {
      const details = await fetchTmdbMovie(result.tmdb_id, result.media_type);
      setSelectedTmdb(details);

      const nextValues = mapTmdbDetailsToMovieForm(details);
      setM((prev) => ({ ...prev, ...nextValues }));
      setGenresText(nextValues.genres?.join(", ") ?? "");
      toast.success(`${getTmdbTitle(details)} loaded from TMDB`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load TMDB details");
    } finally {
      setTmdbLoadingId(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = buildMoviePayload(m, genresText);
    try {
      if (initial?.id) {
        const { error } = await supabase.from("movies").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Movie updated");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("movies")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success("Movie added");
      }
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const cast = (selectedTmdb?.credits?.cast ?? []).slice(0, 8);
  const crew = (selectedTmdb?.credits?.crew ?? []).filter((person) =>
    ["Director", "Writer", "Screenplay", "Producer"].includes(person.job ?? ""),
  );
  const reviews = (selectedTmdb?.reviews?.results ?? []).slice(0, 3);
  const ugProviders = summarizeProviderRegion(selectedTmdb?.watch_providers?.UG);
  const usProviders = summarizeProviderRegion(selectedTmdb?.watch_providers?.US);
  const certification = selectedTmdb ? getTmdbCertification(selectedTmdb) : null;
  const episodeSummary =
    selectedTmdb?.media_type === "tv"
      ? `${selectedTmdb.number_of_seasons ?? 0} seasons, ${selectedTmdb.number_of_episodes ?? 0} episodes`
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-5xl">
      <section className="border border-border rounded-md p-5 bg-surface space-y-4">
        <div className="flex items-center gap-2">
          <Search className="size-5 text-primary" />
          <h3 className="font-display text-xl">Pick from TMDB</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Search a movie or TV title to pull in posters, backdrops, cast, crew, ratings, trailers,
          episode data, provider links, and reviews.
        </p>

        <div className="space-y-2">
          <Label htmlFor="tmdb-search">TMDB search</Label>
          <Input
            id="tmdb-search"
            value={tmdbQuery}
            onChange={(e) => setTmdbQuery(e.target.value)}
            placeholder="Search for a movie or series"
            className="bg-surface-2 border-border"
          />
          {tmdbSearching && <p className="text-xs text-muted-foreground">Searching TMDB...</p>}
        </div>

        {!!tmdbResults.length && (
          <div className="grid gap-3 md:grid-cols-2">
            {tmdbResults.map((result) => (
              <button
                key={`${result.media_type}-${result.tmdb_id}`}
                type="button"
                onClick={() => applyTmdbResult(result)}
                className="text-left rounded-md border border-border bg-surface-2 p-3 hover:border-primary transition"
                disabled={tmdbLoadingId === result.tmdb_id}
              >
                <div className="flex gap-3">
                  {result.poster_url ? (
                    <img
                      src={result.poster_url}
                      alt=""
                      className="h-20 w-14 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-14 rounded bg-surface-3 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.title}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {result.media_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.release_date?.slice(0, 4) ?? "Unknown year"}{" "}
                      {typeof result.vote_average === "number"
                        ? `• TMDB ${result.vote_average.toFixed(1)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {result.overview ?? "No synopsis available."}
                    </p>
                    <span className="inline-flex mt-2 text-xs text-primary">
                      {tmdbLoadingId === result.tmdb_id ? "Loading..." : "Use this title"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedTmdb && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] border-t border-border pt-5">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {selectedTmdb.poster_url ? (
                  <img
                    src={selectedTmdb.poster_url}
                    alt=""
                    className="w-28 aspect-[2/3] rounded object-cover"
                  />
                ) : null}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display text-2xl">{getTmdbTitle(selectedTmdb)}</h4>
                    <span className="text-[10px] uppercase tracking-wider rounded bg-surface-3 px-2 py-1">
                      {selectedTmdb.media_type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTmdb.release_date ?? selectedTmdb.first_air_date ?? "No release date"}
                    {selectedTmdb.vote_average
                      ? ` • TMDB ${selectedTmdb.vote_average.toFixed(1)}`
                      : ""}
                    {certification ? ` • Rated ${certification}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    {selectedTmdb.overview ?? "No overview available."}
                  </p>
                </div>
              </div>

              {selectedTmdb.backdrop_url && (
                <img
                  src={selectedTmdb.backdrop_url}
                  alt=""
                  className="aspect-video w-full rounded object-cover"
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <MetadataBlock title="Cast">
                  {cast.length ? (
                    cast.map((person) => (
                      <li key={`${person.id}-${person.name}`}>
                        {person.name}
                        {person.character ? ` as ${person.character}` : ""}
                      </li>
                    ))
                  ) : (
                    <li>No cast data</li>
                  )}
                </MetadataBlock>

                <MetadataBlock title="Crew">
                  {crew.length ? (
                    crew.slice(0, 8).map((person) => (
                      <li key={`${person.id}-${person.job}`}>
                        {person.name}
                        {person.job ? ` • ${person.job}` : ""}
                      </li>
                    ))
                  ) : (
                    <li>No crew data</li>
                  )}
                </MetadataBlock>
              </div>
            </div>

            <div className="space-y-4">
              <MetadataCard title="Ratings">
                <p>TMDB rating: {selectedTmdb.vote_average?.toFixed(1) ?? "N/A"}</p>
                <p>Content rating: {certification ?? "N/A"}</p>
              </MetadataCard>

              <MetadataCard title="Trailer">
                {selectedTmdb.trailer_url ? (
                  <a
                    href={selectedTmdb.trailer_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Open trailer
                  </a>
                ) : (
                  <p>No trailer found.</p>
                )}
              </MetadataCard>

              <MetadataCard title="Watch providers">
                {ugProviders.length ? (
                  <>
                    <p className="font-medium">Uganda</p>
                    <ProviderList providers={ugProviders} />
                  </>
                ) : (
                  <p>No Uganda provider data.</p>
                )}
                {selectedTmdb.watch_providers?.UG?.link && (
                  <a
                    href={selectedTmdb.watch_providers.UG.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline block mt-2"
                  >
                    Open Uganda watch provider page
                  </a>
                )}
                {!ugProviders.length && !!usProviders.length && (
                  <>
                    <p className="font-medium mt-3">US fallback</p>
                    <ProviderList providers={usProviders} />
                  </>
                )}
              </MetadataCard>

              <MetadataCard title="Episode data">
                {episodeSummary ? (
                  <>
                    <p>{episodeSummary}</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      {(selectedTmdb.seasons ?? []).slice(0, 6).map((season) => (
                        <li key={season.id ?? season.season_number}>
                          {season.name ?? `Season ${season.season_number ?? "?"}`}
                          {season.episode_count ? ` • ${season.episode_count} episodes` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>This title is a movie, so there is no episode data.</p>
                )}
              </MetadataCard>

              <MetadataCard title="Reviews">
                {reviews.length ? (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id}>
                        <p className="text-sm font-medium">{review.author ?? "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {review.content ?? "No review text."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No reviews found.</p>
                )}
              </MetadataCard>
            </div>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={m.title}
            onChange={(e) => setM({ ...m, title: e.target.value })}
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            rows={4}
            value={m.description ?? ""}
            onChange={(e) => setM({ ...m, description: e.target.value })}
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>Release year</Label>
          <Input
            type="number"
            value={m.release_year ?? ""}
            onChange={(e) =>
              setM({ ...m, release_year: e.target.value ? Number(e.target.value) : null })
            }
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={m.duration_minutes ?? ""}
            onChange={(e) =>
              setM({ ...m, duration_minutes: e.target.value ? Number(e.target.value) : null })
            }
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>Rating</Label>
          <Input
            value={m.rating ?? ""}
            onChange={(e) => setM({ ...m, rating: e.target.value })}
            placeholder="PG, PG-13, R..."
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>Genres (comma-separated)</Label>
          <Input
            value={genresText}
            onChange={(e) => setGenresText(e.target.value)}
            placeholder="Action, Drama, Sci-Fi"
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>TMDB ID</Label>
          <Input
            value={m.tmdb_id ?? ""}
            onChange={(e) => setM({ ...m, tmdb_id: e.target.value || null })}
            className="mt-1 bg-surface border-border"
          />
        </div>
        <div>
          <Label>TMDB media type</Label>
          <select
            value={m.tmdb_media_type ?? "movie"}
            onChange={(e) => setM({ ...m, tmdb_media_type: e.target.value || null })}
            className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Trailer URL (YouTube link or video file URL)</Label>
          <Input
            value={m.trailer_url ?? ""}
            onChange={(e) => setM({ ...m, trailer_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="mt-1 bg-surface border-border"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-border rounded-md p-4 bg-surface">
          <Label className="block mb-2">Poster (vertical, 2:3)</Label>
          {m.poster_url && (
            <img
              src={m.poster_url}
              alt=""
              className="aspect-[2/3] w-32 object-cover rounded mb-3"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onPoster}
            disabled={posterUploading}
            className="text-sm"
          />
          {posterUploading && (
            <p className="text-xs text-muted-foreground mt-2">
              <Loader2 className="inline size-3 animate-spin" /> Uploading...
            </p>
          )}
        </div>
        <div className="border border-border rounded-md p-4 bg-surface">
          <Label className="block mb-2">Backdrop (wide, 16:9)</Label>
          {m.backdrop_url && (
            <img
              src={m.backdrop_url}
              alt=""
              className="aspect-video w-full object-cover rounded mb-3"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onBackdrop}
            disabled={backdropUploading}
            className="text-sm"
          />
          {backdropUploading && (
            <p className="text-xs text-muted-foreground mt-2">
              <Loader2 className="inline size-3 animate-spin" /> Uploading...
            </p>
          )}
        </div>
      </div>

      <div className="border border-border rounded-md p-5 bg-surface space-y-3">
        <div className="flex items-center gap-2">
          <Film className="size-5 text-primary" />
          <h3 className="font-display text-xl">Movie video</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Video is re-encoded in your browser before upload to reduce file size.
        </p>

        {m.video_url && (
          <div className="text-xs text-accent">
            Uploaded video preview:{" "}
            <a href={m.video_url} target="_blank" rel="noreferrer" className="underline">
              open
            </a>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Max height</Label>
            <select
              value={maxHeight}
              onChange={(e) => setMaxHeight(Number(e.target.value))}
              className="mt-1 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value={480}>480p (smallest)</option>
              <option value={720}>720p (recommended)</option>
              <option value={1080}>1080p (larger)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Quality (CRF) - {crf}</Label>
            <input
              type="range"
              min={20}
              max={32}
              value={crf}
              onChange={(e) => setCrf(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Better</span>
              <span>Smaller</span>
            </div>
          </div>
        </div>

        <input
          type="file"
          accept="video/*"
          onChange={onVideo}
          disabled={videoBusy.phase !== "idle"}
          className="text-sm block"
        />

        {videoBusy.phase !== "idle" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{videoBusy.phase === "compressing" ? "Compressing" : "Uploading"}...</span>
              <span>{Math.round(videoBusy.progress * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${videoBusy.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {videoBusy.original && videoBusy.compressed && videoBusy.phase === "idle" && (
          <p className="text-xs text-muted-foreground">
            {formatBytes(videoBusy.original)} {"->"} {formatBytes(videoBusy.compressed)} (
            {Math.round((1 - videoBusy.compressed / videoBusy.original) * 100)}% smaller)
          </p>
        )}
      </div>

      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={m.published} onCheckedChange={(v) => setM({ ...m, published: v })} />
          Published
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={m.featured} onCheckedChange={(v) => setM({ ...m, featured: v })} />
          Featured
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Upload className="size-4" /> {initial?.id ? "Update movie" : "Add movie"}
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin" })}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MetadataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-border rounded-md p-4 bg-surface-2 text-sm space-y-2">
      <h5 className="font-medium flex items-center gap-2">
        {title === "Episode data" ? (
          <Tv className="size-4 text-primary" />
        ) : (
          <Star className="size-4 text-primary" />
        )}
        {title}
      </h5>
      <div className="text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

function MetadataBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-border rounded-md p-4 bg-surface-2">
      <h5 className="font-medium mb-2">{title}</h5>
      <ul className="text-sm text-muted-foreground space-y-1">{children}</ul>
    </div>
  );
}

function ProviderList({ providers }: { providers: Array<{ type: string; name: string }> }) {
  return (
    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
      {providers.map((provider, index) => (
        <li key={`${provider.type}-${provider.name}-${index}`}>
          {provider.type}: {provider.name}
        </li>
      ))}
    </ul>
  );
}
