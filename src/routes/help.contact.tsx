import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/help/contact")({
  head: () => ({ meta: [{ title: "Contact — U Stream" }] }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[100px] max-w-[900px] mx-auto px-4 md:px-10 pb-20">
        <h1 className="font-display text-4xl mb-4">Contact</h1>
        <p className="text-muted-foreground">
          Email us at{" "}
          <a href="mailto:support@ustream.example" className="text-primary">
            support@ustream.example
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
