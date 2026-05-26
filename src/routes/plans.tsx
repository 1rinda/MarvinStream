import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Pricing — U Stream" },
      {
        name: "description",
        content: "Affordable streaming plans in UGX. Pay with MTN Mobile Money or Airtel Money.",
      },
    ],
  }),
  component: Plans,
});

const fmtUGX = (n: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(n);

function Plans() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="pt-[120px] max-w-[1400px] mx-auto px-4 md:px-10 pb-20">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <span className="inline-block bg-primary/20 text-primary border border-primary/40 px-3 py-1 rounded-full text-xs uppercase tracking-widest mb-4">
            Made for Uganda
          </span>
          <h1 className="font-display text-5xl md:text-6xl mb-4">Pick a plan that fits</h1>
          <p className="text-muted-foreground text-lg">
            All prices in Ugandan Shillings. Pay with MTN MoMo or Airtel Money. Cancel anytime.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Smartphone className="size-4" /> Mobile Money powered by Flutterwave
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p, i) => {
            const popular = p.name === "Standard";
            return (
              <div
                key={p.id}
                className={`relative rounded-md border p-6 flex flex-col bg-surface ${popular ? "border-primary shadow-glow" : "border-border"}`}
              >
                {popular && (
                  <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-2 py-1 rounded-sm">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-3xl">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{p.tagline}</p>
                <div className="mb-1">
                  <span className="font-display text-4xl">{fmtUGX(p.price_ugx)}</span>
                  <span className="text-muted-foreground text-sm"> /month</span>
                </div>
                <div className="text-xs text-muted-foreground mb-5">
                  {p.max_quality} • Up to {p.max_devices} device{p.max_devices > 1 ? "s" : ""}
                </div>
                <ul className="space-y-2 text-sm flex-1">
                  {p.features?.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="size-4 text-accent shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={popular ? "default" : "secondary"}
                  onClick={() =>
                    toast.info("Mobile Money checkout coming soon", {
                      description: "Flutterwave integration will be wired in v2.",
                    })
                  }
                >
                  Choose {p.name}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
          Payments are processed by Flutterwave once configured. By subscribing you agree to U
          Stream's terms of service.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
