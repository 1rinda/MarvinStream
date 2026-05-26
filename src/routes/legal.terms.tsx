import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({ meta: [{ title: "Terms — U Stream" }] }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[900px] mx-auto px-4 md:px-10 pb-20">
        <h1 className="font-display text-4xl mb-4">Terms of use</h1>
        <p className="text-muted-foreground">
          Short terms placeholder. Replace with your legal terms.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
