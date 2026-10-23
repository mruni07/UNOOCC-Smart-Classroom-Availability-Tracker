import { Link } from "@tanstack/react-router";
import { NAV } from "./Header";
import { LiveIndicator } from "./LiveIndicator";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-auto bg-hero text-hero-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm text-hero-muted">
            Smart Classroom &amp; Laboratory Availability Tracker. Find the right room at the right
            time with less searching.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-hero-foreground/15 px-3 py-1 text-xs font-medium text-hero-muted">
            Pilot: covers selected rooms in the Digital Tower, floors 4–6
          </p>
        </div>
        <div className="md:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hero-muted">
            Quick links
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="text-hero-foreground/85 transition-colors hover:text-brand"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hero-muted">
            Live data
          </p>
          <div className="mt-4">
            <LiveIndicator light />
          </div>
          <p className="mt-3 text-xs text-hero-muted">
            Times shown in India Standard Time (Asia/Kolkata).
          </p>
        </div>
      </div>
      <div className="border-t border-hero-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-hero-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 UNOOCC, Ramdeobaba University · Idea Lab, Group 40</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-hero-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-hero-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
