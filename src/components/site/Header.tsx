import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/find", label: "Find a Room" },
  { to: "/map", label: "Floor Map" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/faculty-update", label: "Faculty Update" },
  { to: "/coordinator/timetables", label: "Coordinator" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => actions.setTheme(dark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function RoomSearch({ className, onDone }: { className?: string; onDone?: () => void }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();
  const rooms = useStore((s) => s.rooms);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return rooms
      .filter(
        (r) =>
          r.id.toLowerCase().includes(t) ||
          (r.name ?? "").toLowerCase().includes(t) ||
          r.type.toLowerCase().includes(t),
      )
      .slice(0, 6);
  }, [q, rooms]);

  return (
    <div className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim()) return;
          navigate({ to: "/find", search: { q: q.trim() } });
          setQ("");
          onDone?.();
        }}
        className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 transition-colors focus-within:border-brand"
      >
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => window.setTimeout(() => setFocus(false), 150)}
          placeholder="Search a room…"
          aria-label="Search rooms"
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </form>
      {focus && matches.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-popover p-1 shadow-lift">
          {matches.map((r) => (
            <Link
              key={r.id}
              to="/map"
              search={{ floor: r.floor, room: r.id }}
              onClick={() => {
                setQ("");
                onDone?.();
              }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-mono font-semibold text-foreground">{r.id}</span>
              <span className="text-xs text-muted-foreground">
                {r.name ?? r.type} · F{r.floor}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="UNOOCC home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <RoomSearch className="hidden w-48 md:block" />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl border bg-card text-foreground xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
              <Logo />
              <RoomSearch className="mt-6" onDone={() => setOpen(false)} />
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: n.to === "/" }}
                    className="rounded-xl px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                    activeProps={{ className: "bg-brand-soft text-brand" }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
