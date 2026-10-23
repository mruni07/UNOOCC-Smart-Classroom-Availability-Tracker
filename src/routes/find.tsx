import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { CalendarDays, LayoutGrid, Rows3, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useMemo } from "react";
import { AssistantChat } from "@/components/site/AssistantChat";
import { LiveIndicator } from "@/components/site/LiveIndicator";
import { PageHeader } from "@/components/site/PageHeader";
import { RoomCard } from "@/components/site/RoomCard";
import { TimeSlider } from "@/components/site/TimeSlider";
import { TimetableGrid } from "@/components/site/TimetableGrid";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useRoomStates } from "@/hooks/use-room-states";
import { isAvailable, sortStates } from "@/lib/availability";
import { ROOM_TYPES, type RoomType } from "@/lib/rooms-data";
import { useStore } from "@/lib/store";
import { addDays, DAY_END, dateLabel, defaultStart, fmtDuration, weekdayOf } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface FindSearch {
  date?: string | undefined;
  from?: number | undefined;
  dur?: number | undefined;
  floor?: number | undefined;
  type?: RoomType | undefined;
  cap?: number | undefined;
  all?: boolean | undefined;
  view?: "cards" | "grid" | undefined;
  q?: string | undefined;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

export const Route = createFileRoute("/find")({
  validateSearch: (s: Partial<Record<keyof FindSearch, unknown>>): FindSearch => ({
    date: typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : undefined,
    from: num(s.from),
    dur: num(s.dur),
    floor: num(s.floor),
    type: ROOM_TYPES.includes(s.type as RoomType) ? (s.type as RoomType) : undefined,
    cap: num(s.cap),
    all: s.all === true || s.all === "true" ? true : undefined,
    view: s.view === "grid" ? "grid" : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find a free room — UNOOCC" },
      {
        name: "description",
        content:
          "Filter classrooms, labs and seminar halls by day, time, floor and capacity to see what’s free.",
      },
      { property: "og:title", content: "Find a free room — UNOOCC" },
      {
        property: "og:description",
        content: "Search the university room list with filters and clear availability confidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FindPage,
});

const DURATIONS = [30, 60, 90, 120, 180];

function FindPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/find" });
  const { now } = useNow();
  const favorites = useStore((s) => s.favorites);
  const databaseRooms = useStore((s) => s.rooms);
  const timetableStatus = useStore((s) => s.timetableStatus);
  const timetableError = useStore((s) => s.timetableError);
  const floors = useMemo(
    () => [...new Set(databaseRooms.map((room) => room.floor))].sort((a, b) => a - b),
    [databaseRooms],
  );

  const set = (patch: Partial<FindSearch>) =>
    navigate({
      search: (prev: FindSearch) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });

  const today = now?.dateISO;
  const dateISO = search.date ?? today;
  const isToday = dateISO === today;
  const from = search.from ?? (now && isToday ? defaultStart(now.minutes) : 9 * 60);
  const dur = Math.min(search.dur ?? 60, DAY_END - from);
  const to = from + dur;
  const followingNow = search.from === undefined && isToday;

  const win = useMemo(
    () => (dateISO ? { dateISO, weekday: weekdayOf(dateISO), from, to } : null),
    [dateISO, from, to],
  );

  const rooms = useMemo(() => {
    const q = search.q?.toLowerCase();
    return databaseRooms.filter(
      (r) =>
        (search.floor === undefined || r.floor === search.floor) &&
        (!search.type || r.type === search.type) &&
        (!search.cap || (r.capacity !== null && r.capacity >= search.cap)) &&
        (!q ||
          r.id.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)),
    );
  }, [databaseRooms, search.floor, search.type, search.cap, search.q]);

  const states = useRoomStates(win, rooms);
  const sorted = useMemo(() => sortStates(states, from, favorites), [states, from, favorites]);
  const visible = search.all ? sorted : sorted.filter(isAvailable);
  const freeCount = states.filter(isAvailable).length;

  const days = today ? Array.from({ length: 7 }, (_, i) => addDays(today, i)) : [];
  const activeFilters = [
    search.floor !== undefined,
    !!search.type,
    !!search.cap,
    !!search.q,
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        eyebrow="Find a room"
        title="Find a room"
        description="Search the published room list. Matching rooms with no listed class are still unverified."
      >
        <LiveIndicator />
      </PageHeader>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-8">
        {timetableStatus === "error" && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive lg:col-span-12"
          >
            Room data could not be loaded. {timetableError}
          </p>
        )}
        {timetableStatus === "loading" && (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground lg:col-span-12">
            Loading room data…
          </p>
        )}
        <div className="space-y-6 lg:col-span-8">
          {/* Filters */}
          <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="size-4 text-brand" /> Filters
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    set({ floor: undefined, type: undefined, cap: undefined, q: undefined })
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" /> Clear {activeFilters}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Day" className="col-span-2 md:col-span-1">
                <Select
                  value={dateISO ?? ""}
                  onValueChange={(v) => set({ date: v === today ? undefined : v, from: undefined })}
                >
                  <SelectTrigger className="rounded-xl">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Today" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {dateLabel(d, today)}
                        {weekdayOf(d) === 0 ? " · no classes" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="For">
                <Select
                  value={String(search.dur ?? 60)}
                  onValueChange={(v) => set({ dur: v === "60" ? undefined : Number(v) })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {fmtDuration(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Floor">
                <Select
                  value={search.floor === undefined ? "all" : String(search.floor)}
                  onValueChange={(v) => set({ floor: v === "all" ? undefined : Number(v) })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All floors</SelectItem>
                    {floors.map((f) => (
                      <SelectItem key={f} value={String(f)}>
                        Floor {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Room type">
                <Select
                  value={search.type ?? "all"}
                  onValueChange={(v) => set({ type: v === "all" ? undefined : (v as RoomType) })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any type</SelectItem>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Min. seats">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Any"
                  value={search.cap ?? ""}
                  onChange={(e) =>
                    set({ cap: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="rounded-xl"
                />
              </Field>
            </div>
            {search.q && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                Matching “{search.q}”
                <button
                  type="button"
                  onClick={() => set({ q: undefined })}
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              </p>
            )}
            <TimeSlider
              className="mt-4 border-dashed shadow-none"
              value={from}
              duration={dur}
              onChange={(v) => set({ from: v })}
              onNow={isToday ? () => set({ from: undefined }) : undefined}
              isNow={followingNow}
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {now ? (
                <>
                  <span className="font-display text-lg font-bold text-foreground">
                    {freeCount}
                  </span>{" "}
                  of {states.length} possibly available
                  {win?.weekday === 0 && " · Sunday, no classes scheduled"}
                </>
              ) : (
                "Checking rooms…"
              )}
            </p>
            <div className="flex items-center gap-2">
              <Segmented
                value={search.all ? "all" : "free"}
                options={[
                  { value: "free", label: "No class listed / available" },
                  { value: "all", label: "All rooms" },
                ]}
                onChange={(v) => set({ all: v === "all" ? true : undefined })}
              />
              <Segmented
                value={search.view ?? "cards"}
                options={[
                  { value: "cards", label: "Cards", icon: LayoutGrid },
                  { value: "grid", label: "Timetable", icon: Rows3 },
                ]}
                onChange={(v) => set({ view: v === "grid" ? "grid" : undefined })}
              />
            </div>
          </div>

          {/* Results */}
          {!now ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
              <SearchX className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 font-display text-lg font-bold text-foreground">
                No rooms match these filters.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a shorter slot or another floor.
              </p>
            </div>
          ) : search.view === "grid" ? (
            <TimetableGrid states={visible} from={from} to={to} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {visible.map((s) => (
                  <RoomCard key={s.room.id} state={s} from={from} to={to} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-24 h-[calc(100vh-8rem)] max-h-[720px]">
            <AssistantChat />
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; icon?: typeof LayoutGrid }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border bg-card p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon && <o.icon className="size-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
