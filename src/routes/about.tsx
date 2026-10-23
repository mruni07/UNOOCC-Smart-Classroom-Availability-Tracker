import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/motion";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About UNOOCC — Smart Classroom & Laboratory Availability Tracker" },
      {
        name: "description",
        content:
          "The problem, solution, team and research behind UNOOCC, an Idea Lab project at Ramdeobaba University.",
      },
      { property: "og:title", content: "About UNOOCC" },
      {
        property: "og:description",
        content:
          "A campus room availability pilot with deterministic rules and verified-data safeguards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const PSI = [
  {
    icon: AlertTriangle,
    label: "Problem",
    text: "There is no centralized system showing the current availability of classrooms and laboratories.",
    cls: "bg-busy-soft text-busy",
  },
  {
    icon: Lightbulb,
    label: "Solution",
    text: "A web portal and deterministic assistant designed to combine a verified timetable with approved faculty updates.",
    cls: "bg-sky text-primary",
  },
  {
    icon: Sparkles,
    label: "Impact",
    text: "Saves time, finds vacant rooms quickly, reduces room-search effort, improves infrastructure utilization and reduces scheduling conflicts.",
    cls: "bg-free-soft text-free",
  },
];

const OBJECTIVES = [
  "Connect a verified room master and timetable",
  "Show availability with clear confidence",
  "Add authenticated faculty updates",
  "Improve room utilization",
];
const FUTURE = [
  "Mobile application",
  "Live faculty/staff updates through an API",
  "ERP / LMS integration",
  "Multi-campus support",
  "Usage analytics dashboard",
  "Advanced AI support",
];

const TEAM = [
  { name: "Aayushi Dehankar", roll: "02" },
  { name: "Mrunmayee Gajarlwar", roll: "17" },
  { name: "Sanskriti Halder", roll: "20" },
  { name: "Prathmesh Pakhale", roll: "41" },
];

const REFS = [
  "A Classroom Scheduling Service for Smart Classes (2015) — classroom scheduling using web services.",
  "Modeling Classroom Occupancy Using WiFi Infrastructure (2022) — estimating occupancy from WiFi data.",
  "A. Zanella, N. Bui, A. Castellani, L. Vangelista and M. Zorzi, “Internet of Things for Smart Cities,” IEEE Internet of Things Journal, vol. 1, no. 1, pp. 22–32, 2014.",
  "A Classroom Usage Monitoring System with Image Detection (2024) — monitoring with image detection.",
  "Smart Classroom for Better Pedagogical Process and Effective Energy Utilisation (2023) — smart classrooms and energy use.",
];

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("");

function About() {
  return (
    <>
      <PageHeader
        eyebrow="Idea Lab · Group 40"
        title="UNOOCC, Smart Classroom & Laboratory Availability Tracker"
        description="Real-time room availability for smarter campus resource use."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {PSI.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.1}>
              <div className="card-lift relative h-full rounded-2xl border bg-card p-6 shadow-card">
                <span className={`grid size-12 place-items-center rounded-xl ${p.cls}`}>
                  <p.icon className="size-6" />
                </span>
                <p className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-brand">
                  {p.label}
                </p>
                <p className="mt-2 text-foreground">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl bg-hero p-8 text-hero-foreground">
              <Target className="size-7 text-brand" />
              <h2 className="mt-4 text-2xl font-extrabold">Objectives</h2>
              <ul className="mt-5 space-y-3">
                {OBJECTIVES.map((o) => (
                  <li key={o} className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-brand" /> {o}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border bg-gradient-soft p-8">
              <Rocket className="size-7 text-brand" />
              <h2 className="mt-4 text-2xl font-extrabold text-foreground">Future scope</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {FUTURE.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">The team</p>
            <h2 className="mt-2 text-3xl font-extrabold text-foreground">
              Built by students, for students.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div className="card-lift rounded-2xl border bg-card p-6 text-center shadow-card">
                  <span className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-brand font-display text-2xl font-extrabold text-brand-foreground">
                    {initials(t.name)}
                  </span>
                  <p className="mt-4 font-display text-lg font-bold text-foreground">{t.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">Roll No. {t.roll}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-card sm:flex-row sm:items-center">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <GraduationCap className="size-7" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Guide
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  Mr. Siddhant Jaiswal
                </p>
                <p className="text-sm text-muted-foreground">
                  Assistant Professor, Department of Computer Science &amp; Engineering
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Academic year</dt>
                  <dd className="font-mono font-bold text-foreground">2026–27</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Project code</dt>
                  <dd className="font-mono font-bold text-foreground">24CSO4PRO5O5</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-brand" />
          <h2 className="text-2xl font-extrabold text-foreground">References</h2>
        </div>
        <ol className="mt-6 space-y-3">
          {REFS.map((r, i) => (
            <li
              key={r}
              className="flex gap-4 rounded-xl border bg-card p-4 text-sm text-foreground"
            >
              <span className="font-mono font-bold text-brand">[{i + 1}]</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
