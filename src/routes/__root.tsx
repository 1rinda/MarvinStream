import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/hooks/use-profiles";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the stream</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been removed.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition"
        >
          Back to U Stream
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary-hover transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "U Stream — Watch movies & series in Uganda" },
      {
        name: "description",
        content:
          "Stream blockbuster movies and series in Uganda. Pay in UGX with Mobile Money. Watch anywhere.",
      },
      { property: "og:title", content: "U Stream — Watch movies & series in Uganda" },
      {
        property: "og:description",
        content: "Stream blockbuster movies and series in Uganda. Pay in UGX with Mobile Money.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="resn-grain" />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function ProfileGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile, isLoading: profilesLoading } = useProfiles();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeProfile?.is_kids) {
      document.body.classList.add("is-kids");
    } else {
      document.body.classList.remove("is-kids");
    }
  }, [activeProfile]);

  useEffect(() => {
    if (authLoading || profilesLoading) return;

    const isPublic = ["/login", "/signup", "/profiles"].includes(location.pathname);

    if (user && !activeProfile && !isPublic) {
      navigate({ to: "/profiles" });
    }
  }, [user, activeProfile, authLoading, profilesLoading, location.pathname, navigate]);

  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthSync />
        <ProfileGate>
          <Outlet />
        </ProfileGate>
        <Toaster theme="dark" richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
