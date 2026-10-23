import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  MessageSquareText,
  Radio,
  RefreshCcw,
  Search,
  Timer,
} from "lucide-react";
import { useMemo, useState } from "react";
import heroImg from "@/assets/digital-tower.jpg";
const heroAsset = { url: heroImg };
import { CountUp, Reveal } from "@/components/site/motion";
import { LiveIndicator } from "@/components/site/LiveIndicator";
import { StatusBadge } from "@/components/site/StatusBadge";
import { statusLine } from "@/components/site/RoomCard";
import { TimeSlider } from "@/components/site/TimeSlider";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { useRoomStates } from "@/hooks/use-room-states";
import { isAvailable, sortStates } from "@/lib/availability";
import { actions } from "@/lib/store";
import { DAY_END, defaultStart, fmt } from "@/lib/time";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNOOCC — Find a free classroom or lab in seconds" },
      {
        name: "description",
        content:
          "UNOOCC shows which classrooms and labs at Ramdeobaba University are free right now, and until when.",
      },
      { property: "og:title", content: "UNOOCC — Find a free room in seconds" },
      {
        property: "og:description",
        content:
          "A classroom and lab availability tracker for Ramdeobaba University, powered by coordinator-reviewed Supabase room and timetable records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const STEPS = [
  {
    icon: Search,
    title: "Search",
    text: "Pick a day, time, floor or room type, or just ask in plain language.",
  },
  {
    icon: RefreshCcw,
    title: "Check",
    text: "UNOOCC applies deterministic time overlap rules to available schedule data.",
  },
  {
    icon: CheckCircle2,
    title: "Go",
    text: "Rooms without a listed class stay marked as unverified.",
  },
];

const WHY = [
  {
    icon: Radio,
    title: "Room status",
    text: "Room and schedule data from Supabase, with uncertainty shown when records are incomplete.",
  },
  {
    icon: Timer,
    title: "Faculty reports",
    text: "Submissions are stored pending until an authenticated approval workflow is configured.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Low cost",
    text: "No expensive sensors, cameras or WiFi tracking.",
  },
  {
    icon: MessageSquareText,
    title: "Natural language",
    text: "Ask “Which classrooms are free on floor 6 right now?”",
  },
];

function Home() {
  const { now } = useNow();
  const nowWin = useMemo(() => {
    if (!now) return null;
    const from = now.minutes < DAY_END ? Math.max(now.minutes, 9 * 60) : DAY_END - 1;
    return { dateISO: now.dateISO, weekday: now.weekday, from, to: from + 1 };
  }, [now]);
  const states = useRoomStates(nowWin);
  const free = states.filter(isAvailable).length;
  const busy = states.filter((s) => s.status === "busy").length;
  const nextChange = useMemo(() => {
    if (!nowWin) return null;
    const times = states
      .flatMap((s) => s.bookings.flatMap((b) => [b.start, b.end]))
      .filter((t) => t > nowWin.from);
    return times.length ? Math.min(...times) : null;
  }, [states, nowWin]);
  const preview = sortStates(
    states.filter((s) => s.status !== "offline"),
    nowWin?.from ?? 0,
  ).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-hero text-hero-foreground">
        <img
          src={heroAsset.url}
          alt="The Digital Tower at Ramdeobaba University at dusk"
          width={938}
          height={750}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-16 sm:px-6 md:pt-24 lg:grid-cols-12 lg:px-8 lg:pb-24">
          <div className="lg:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full glass-dark px-3 py-1.5 text-xs font-semibold"
            >
              <span className="size-2 rounded-full bg-unverified" /> Digital Tower · Availability
              tracker
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5 }}
              className="mt-6 text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl"
            >
              Find a free room <span className="text-gradient-brand">in seconds.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="mt-6 max-w-xl text-lg text-hero-muted"
            >
              Explore rooms and schedules published by the university. A room without a listed class
              is not confirmed physically available.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button asChild variant="hero" size="xl">
                <Link to="/find">
                  Find a free room now <ArrowRight />
                </Link>
              </Button>
              <Button variant="glass" size="xl" onClick={() => actions.setAssistantOpen(true)}>
                <MessageSquareText /> Ask the assistant
              </Button>
            </motion.div>
          </div>

          {/* Live preview card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="glass-dark rounded-3xl p-5 shadow-lift">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold">Pilot status</p>
                <span className="font-mono text-xs text-hero-muted">
                  {now ? fmt(now.minutes) : "--:--"} IST
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(preview.length ? preview : Array.from<null>({ length: 4 }).fill(null)).map(
                  (s, i) =>
                    s ? (
                      <Link
                        key={s.room.id}
                        to="/map"
                        search={{ floor: s.room.floor, room: s.room.id }}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-card/95 px-4 py-3 text-card-foreground transition-transform hover:-translate-y-0.5"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold">{s.room.id}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {statusLine(s, nowWin?.from ?? 0).main} · Floor {s.room.floor}
                          </p>
                        </div>
                        <StatusBadge status={s.status} pulse={s.justFreed} />
                      </Link>
                    ) : (
                      <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-card/20" />
                    ),
                )}
              </div>
              <LiveIndicator light className="mt-4" />
            </div>
          </motion.div>
        </div>

        {/* Live status strip */}
        <div className="border-t border-hero-foreground/10 bg-hero/60 backdrop-blur">
          <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-hero-foreground/10 px-4 sm:px-6 lg:px-8">
            {[
              { label: "Possibly available", value: free, unit: "rooms", cls: "text-unverified" },
              { label: "Verified busy", value: busy, unit: "rooms", cls: "text-busy" },
            ].map((c) => (
              <div key={c.label} className="py-5 pr-4 sm:py-6">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-hero-muted">
                  {c.label}
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
                  {now ? <CountUp value={c.value} className={c.cls} /> : "–"}
                  <span className="ml-1.5 text-sm font-medium text-hero-muted">{c.unit}</span>
                </p>
              </div>
            ))}
            <div className="py-5 pl-4 sm:py-6 sm:pl-6">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-hero-muted">
                Next change at
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-brand sm:text-4xl">
                {nextChange ? fmt(nextChange) : "--:--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
            Three steps
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            Stop walking floor to floor.
          </h2>
        </Reveal>
        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div
            className="absolute left-0 right-0 top-8 hidden h-px bg-border md:block"
            aria-hidden
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1} className="relative">
              <span className="relative z-10 grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <s.icon className="size-7" />
                <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-brand font-mono text-xs font-bold text-brand-foreground">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 text-xl font-bold text-foreground">{s.title}.</h3>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Scrub demo */}
      <ScrubDemo />

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">Why UNOOCC</p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            A clear path to trusted room availability.
          </h2>
          <p className="mt-3 text-muted-foreground">
            No cameras, WiFi tracking or occupancy sensors — so it respects privacy and costs far
            less.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.08}>
              <div className="card-lift h-full rounded-2xl border bg-card p-6 shadow-card">
                <span
                  className={cn(
                    "grid size-12 place-items-center rounded-xl",
                    i % 2 ? "bg-peach text-brand" : "bg-sky text-primary",
                  )}
                >
                  <w.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-foreground">{w.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{w.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing banner */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-hero px-6 py-14 text-hero-foreground sm:px-12">
          <div
            className="absolute -right-24 -top-24 size-72 rounded-full bg-brand/30 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -bottom-24 left-10 size-72 rounded-full bg-free/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
              Smarter Classrooms. Better Campus.{" "}
              <span className="text-gradient-brand">A More Connected Future.</span>
            </h2>
            <Button asChild variant="hero" size="xl">
              <Link to="/map">
                Open the floor map <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function ScrubDemo() {
  const { now } = useNow();
  const [t, setT] = useState<number | null>(null);
  const base = now ? defaultStart(now.minutes) : 11 * 60;
  const from = t ?? base;
  const win = useMemo(
    () =>
      now
        ? {
            dateISO: now.dateISO,
            weekday: now.weekday === 0 ? 1 : now.weekday,
            from,
            to: from + 60,
          }
        : null,
    [now, from],
  );
  const states = useRoomStates(win);

  return (
    <section className="border-y bg-gradient-soft">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
        <Reveal className="lg:col-span-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">Try it</p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            Drag through the day. Watch rooms change.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Room and timetable records require coordinator review. A room with no listed class is
            marked unverified until physical availability can be confirmed.
          </p>
          <TimeSlider
            className="mt-6"
            value={from}
            duration={60}
            onChange={setT}
            onNow={() => setT(null)}
            isNow={t === null}
          />
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {(states.length ? states : Array.from<null>({ length: 4 }).fill(null)).map((s, i) =>
              s ? (
                <Link
                  key={s.room.id}
                  to="/map"
                  search={{ floor: s.room.floor, room: s.room.id }}
                  className={cn(
                    "rounded-2xl border p-3 transition-colors duration-300 hover:-translate-y-0.5",
                    s.status === "free" && "border-free/30 bg-free-soft",
                    s.status === "busy" && "border-busy/30 bg-busy-soft",
                    s.status === "unverified" && "border-unverified/40 bg-unverified-soft",
                    s.status === "offline" && "border-offline/30 bg-offline-soft",
                  )}
                >
                  <p className="font-mono text-sm font-bold text-foreground">{s.room.id}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      s.status === "free" && "text-free",
                      s.status === "busy" && "text-busy",
                      s.status === "unverified" && "text-unverified",
                      s.status === "offline" && "text-offline",
                    )}
                  >
                    {s.status === "free"
                      ? "✓ Free"
                      : s.status === "busy"
                        ? "✕ Busy"
                        : s.status === "unverified"
                          ? "? Unverified"
                          : "— Closed"}
                  </p>
                </Link>
              ) : (
                <div key={i} className="h-[66px] animate-pulse rounded-2xl bg-card" />
              ),
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
