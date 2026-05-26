import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function SiteFooter() {
  const { user } = useAuth();
  return (
    <footer className="border-t border-border mt-20 py-10 text-sm text-muted-foreground">
      <div className="max-w-[1600px] mx-auto px-4 md:px-10 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-1 mb-3">
            <span className="bg-primary text-primary-foreground font-display text-2xl px-2 leading-none rounded-sm">
              U
            </span>
            <span className="font-display text-xl tracking-wider text-foreground">STREAM</span>
          </div>
          <p>Stream the world's best films and series. Made for Uganda, priced in UGX.</p>
        </div>
        {user && (
          <>
            <div>
              <h4 className="text-foreground mb-2 font-display text-lg">Watch</h4>
              <ul className="space-y-1">
                <li>
                  <Link to="/browse">Movies</Link>
                </li>
                <li>
                  <Link to="/browse">Series</Link>
                </li>
                <li>
                  <Link to="/browse">New releases</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground mb-2 font-display text-lg">Account</h4>
              <ul className="space-y-1">
                <li>
                  <Link to="/plans">Plans</Link>
                </li>
                <li>
                  <Link to="/plans">Billing</Link>
                </li>
                <li>
                  <Link to="/plans">Devices</Link>
                </li>
              </ul>
            </div>
          </>
        )}
        <div>
          <h4 className="text-foreground mb-2 font-display text-lg">Help</h4>
          <ul className="space-y-1">
            <li>
              <Link to="/help/faq">FAQ</Link>
            </li>
            <li>
              <Link to="/help/contact">Contact</Link>
            </li>
            <li>
              <Link to="/legal/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="text-center mt-8 text-xs">
        © {new Date().getFullYear()} U Stream. All rights reserved.
      </div>
    </footer>
  );
}
