import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/help/faq")({
  head: () => ({ meta: [{ title: "FAQ — U Stream" }] }),
  component: FAQ,
});

function FAQ() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[900px] mx-auto px-4 md:px-10 pb-20">
        <h1 className="font-display text-4xl mb-4">FAQ</h1>
        <p className="text-muted-foreground">
          Frequently asked questions will appear here. Contact support if you need help.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
