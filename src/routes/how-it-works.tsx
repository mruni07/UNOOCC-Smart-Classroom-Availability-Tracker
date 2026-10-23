import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Braces,
  CalendarClock,
  Cpu,
  Database,
  Globe,
  ListChecks,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How UNOOCC works — pilot status" },
      {
        name: "description",
        content:
          "See how the UNOOCC pilot evaluates room availability and what data is still required.",
      },
      { property: "og:title", content: "How UNOOCC works" },
      {
        property: "og:description",
        content:
          "A low-cost, privacy-friendly way to find free classrooms and labs — no cameras or sensors.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const FLOW = [
  { icon: Globe, title: "Website / Portal", text: "You search or ask a question" },
  { icon: Search, title: "Query parsing", text: "Filters and time range are interpreted" },
  {
    icon: Database,
    title: "Supabase room list",
    text: "Room metadata is loaded from the connected Supabase project",
  },
  { icon: Cpu, title: "Availability logic", text: "Overlap rules use half-open time intervals" },
  {
    icon: Braces,
    title: "Confidence status",
    text: "Rooms stay unverified unless records support a class status",
  },
  {
    icon: ListChecks,
    title: "Results shown",
    text: "Search, map and assistant use the same rules",
  },
];

const STEPS = [
  "You choose a date, time, floor, room type or capacity.",
  "A deterministic parser and overlap rule evaluate the request.",
  "The active timetable is loaded from coordinator-approved Supabase records.",
  "Rooms without a listed class are marked unverified; physical availability is not sensed.",
  "Faculty submissions are stored as pending and do not override availability.",
];

const TECH = ["React 19", "TanStack Start", "Tailwind CSS", "Supabase room and timetable data"];

const COMPARE = [
  ["Scheduling systems", "Plan classes", "No live status"],
  ["WiFi monitoring", "Estimates occupancy", "Needs WiFi setup"],
  ["Camera / image detection", "Detects occupancy", "Hardware cost, privacy concerns"],
  ["Smart classroom systems", "Improve utilization", "No availability portal"],
];

const FAQ = [
  [
    "How often is the status updated?",
    "The view refreshes from Supabase realtime changes when schedules and room records are updated.",
  ],
  [
    "What if a class was moved or added?",
    "Authorized faculty can submit reports. They remain pending until a coordinator reviews them.",
  ],
  [
    "Does UNOOCC use cameras or sensors?",
    "No. The planned availability model uses schedules and approved faculty reports.",
  ],
  [
    "Why does a room show “Possibly free”?",
    "No listed class does not confirm physical availability. Rooms without sufficient verified records remain unverified.",
  ],
  [
    "Which rooms are covered?",
    "The floor map shows room records supplied by the connected Supabase project. Coverage depends on the coordinator-maintained room master.",
  ],
];

function HowItWorks() {
  return (
    <>
      <PageHeader
        eyebrow="Under the hood"
        title="How UNOOCC works"
        description="UNOOCC uses deterministic time overlap rules and reads coordinator-reviewed room and timetable records from Supabase."
      />

      {/* Flow */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {FLOW.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className="relative"
            >
              <div
                className={cn(
                  "card-lift h-full rounded-2xl border bg-card p-5 shadow-card",
                  (i === 0 || i === FLOW.length - 1) && "border-brand/40",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl",
                    i === FLOW.length - 1
                      ? "bg-gradient-brand text-brand-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  <f.icon className="size-5" />
                </span>
                <p className="mt-4 font-mono text-[0.65rem] font-bold text-brand">
                  STEP {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
              {i < FLOW.length - 1 && (
                <svg
                  className="absolute -right-4 top-1/2 z-10 hidden h-4 w-8 -translate-y-1/2 lg:block"
                  viewBox="0 0 32 16"
                  aria-hidden
                >
                  <line
                    x1="0"
                    y1="8"
                    x2="26"
                    y2="8"
                    className="stroke-brand stroke-2 animate-dash"
                  />
                  <path d="M24 3 L31 8 L24 13" className="fill-none stroke-brand stroke-2" />
                </svg>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Plain language */}
      <section className="border-y bg-gradient-soft">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
              In plain language
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-foreground">
              Five things happen every time you search.
            </h2>
            <ol className="mt-8 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-start gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card font-mono text-sm font-bold text-brand shadow-card">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-foreground">{s}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-3xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarClock className="size-4 text-brand" /> The overlap rule
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                A room is busy if any verified class overlaps the time you asked for. Approved
                faculty updates can affect that schedule. Public reports remain pending, and a room
                without verified data shows as “Possibly free”, never “Free”.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-2xl bg-hero p-5 font-mono text-xs leading-relaxed text-hero-foreground">
                {`busy = class.start < requested.end
    && class.end   > requested.start

// a class ending 11:00 → free for 11:00–12:00`}
              </pre>
              <p className="mt-4 text-xs text-muted-foreground">
                The calculation runs in code, not inside the AI, so results stay consistent and
                rooms are never invented.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
            Research gap
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-foreground">
            Why existing approaches fall short
          </h2>
        </Reveal>
        <Reveal
          delay={0.05}
          className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Approach</th>
                  <th className="px-5 py-3 font-semibold">What it does</th>
                  <th className="px-5 py-3 font-semibold">Main weakness</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([a, b, c]) => (
                  <tr key={a} className="border-t">
                    <td className="px-5 py-4 font-semibold text-foreground">{a}</td>
                    <td className="px-5 py-4 text-muted-foreground">{b}</td>
                    <td className="px-5 py-4 text-busy">{c}</td>
                  </tr>
                ))}
                <tr className="border-t bg-brand-soft">
                  <td className="px-5 py-4 font-bold text-foreground">UNOOCC</td>
                  <td className="px-5 py-4 text-foreground">
                    Pilot UI with deterministic availability rules
                  </td>
                  <td className="px-5 py-4 font-semibold text-unverified">
                    Official data connection still required
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>

        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Built with
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TECH.map((t, i) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-full border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-card"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-foreground">Questions, answered</h2>
        <Accordion
          type="single"
          collapsible
          className="mt-6 rounded-2xl border bg-card px-5 shadow-card"
        >
          {FAQ.map(([q, a], i) => (
            <AccordionItem
              key={q}
              value={`q${i}`}
              className={i === FAQ.length - 1 ? "border-b-0" : ""}
            >
              <AccordionTrigger className="text-left font-display text-base font-bold text-foreground hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-8 text-center">
          <Button asChild variant="hero" size="lg">
            <Link to="/find">
              Try it now <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
