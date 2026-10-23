import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info, MousePointerClick, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { FloorMap } from "@/components/site/FloorMap";
import { LiveIndicator } from "@/components/site/LiveIndicator";
import { PageHeader } from "@/components/site/PageHeader";
import { statusLine, TYPE_ICON } from "@/components/site/RoomCard";
import { StatusBadge } from "@/components/site/StatusBadge";
import { TimeSlider } from "@/components/site/TimeSlider";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { useRoomStates } from "@/hooks/use-room-states";
import { isAvailable } from "@/lib/availability";
import { floorOf } from "@/lib/rooms-data";
import { useStore } from "@/lib/store";
import { DAY_END, defaultStart, fmt } from "@/lib/time";
import { cn } from "@/lib/utils";

interface MapSearch {
  floor?: number | undefined;
  room?: string | undefined;
}

export const Route = createFileRoute("/map")({
  validateSearch: (s: Partial<Record<keyof MapSearch, unknown>>): MapSearch => {
    const f = Number(s.floor);
    return {
      floor: Number.isInteger(f) && f >= 0 && f <= 100 ? f : undefined,
      room: typeof s.room === "string" && /^[A-Za-z0-9-]{2,40}$/.test(s.room) ? s.room : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Live floor map — UNOOCC" },
      {
        name: "description",
        content:
          "An interactive floor plan of the Digital Tower with every room coloured free, busy or unverified.",
      },
      { property: "og:title", content: "Live floor map — UNOOCC" },
      {
        property: "og:description",
        content: "Tap any room to see its current class, next change and room type.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/map" });
  const { now } = useNow();
  const rooms = useStore((s) => s.rooms);
  const timetableStatus = useStore((s) => s.timetableStatus);
  const timetableError = useStore((s) => s.timetableError);
  const floors = useMemo(
    () => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b),
    [rooms],
  );
  const floor = search.floor ?? (search.room ? floorOf(search.room) : (floors.at(-1) ?? 0));
  const [hover, setHover] = useState<string | null>(null);
  const [t, setT] = useState<number | null>(null);
  const dir = useRef(1);

  const from = t ?? (now ? defaultStart(now.minutes) : 9 * 60);
  const win = useMemo(
    () => (now ? { dateISO: now.dateISO, weekday: now.weekday, from, to: from + 60 } : null),
    [now, from],
  );
  const floorRooms = useMemo(() => rooms.filter((r) => r.floor === floor), [rooms, floor]);
  const states = useRoomStates(win, floorRooms);
  const allStates = useRoomStates(win);

  const focusId = hover ?? search.room;
  const focus = states.find((s) => s.room.id === focusId);

  const setFloor = (f: number) => {
    dir.current = f > floor ? 1 : -1;
    navigate({ search: { floor: f }, replace: true, resetScroll: false });
  };

  return (
    <>
      <PageHeader
        eyebrow="Digital Tower"
        title="Live floor map"
        description="Rooms are coloured by status. Hover or tap a room to see the current class, the next change and the room type."
      >
        <LiveIndicator />
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div
            className="inline-flex w-fit rounded-2xl border bg-card p-1.5 shadow-card"
            role="tablist"
            aria-label="Floor"
          >
            {floors.map((f) => {
              const possible = allStates.filter((s) => s.room.floor === f && isAvailable(s)).length;
              const total = rooms.filter((r) => r.floor === f).length;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={f === floor}
                  onClick={() => setFloor(f)}
                  className={cn(
                    "relative rounded-xl px-5 py-2.5 text-left transition-colors",
                    f === floor
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === floor && (
                    <motion.span
                      layoutId="floor-pill"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                    />
                  )}
                  <span className="relative block font-display text-sm font-bold">Floor {f}</span>
                  <span className="relative block text-xs opacity-80">
                    {now ? `${possible}/${total} possibly free` : "…"}
                  </span>
                </button>
              );
            })}
          </div>
          <TimeSlider
            className="md:w-[420px]"
            value={from}
            duration={60}
            onChange={setT}
            onNow={() => setT(null)}
            isNow={t === null}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {timetableStatus === "error" && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive lg:col-span-12"
            >
              Room data could not be loaded. {timetableError}
            </p>
          )}
          <div className="self-start overflow-hidden rounded-3xl border bg-card p-3 shadow-card sm:p-5 lg:col-span-8">
            {!now ? (
              <Skeleton className="aspect-[1000/520] w-full rounded-2xl" />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={floor}
                  initial={{ opacity: 0, x: 40 * dir.current }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 * dir.current }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <FloorMap
                    states={states}
                    selectedId={search.room}
                    onSelect={(id) =>
                      navigate({ search: { floor, room: id }, replace: true, resetScroll: false })
                    }
                    onHover={setHover}
                  />
                </motion.div>
              </AnimatePresence>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground">
              <Legend cls="bg-free" label="Green = verified free" />
              <Legend cls="bg-busy" label="Red = Busy" />
              <Legend cls="bg-unverified" label="Amber = Unverified" />
              <Legend cls="bg-offline" label="Grey = Not in service" />
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-3xl border bg-card p-6 shadow-card">
              {focus ? (
                <RoomDetails stateId={focus.room.id} states={states} from={from} />
              ) : (
                <div className="py-10 text-center">
                  <MousePointerClick className="mx-auto size-10 text-brand" />
                  <p className="mt-4 font-display text-lg font-bold text-foreground">Pick a room</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hover or tap any room on the plan to see what’s happening inside.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-4" /> Schedules appear after coordinator approval. A room with no
          listed class is not confirmed physically available.
        </p>
      </div>
    </>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", cls)} /> {label}
    </span>
  );
}

function RoomDetails({
  stateId,
  states,
  from,
}: {
  stateId: string;
  states: ReturnType<typeof useRoomStates>;
  from: number;
}) {
  const s = states.find((x) => x.room.id === stateId);
  if (!s) return null;
  const Icon = TYPE_ICON[s.room.type];
  const line = statusLine(s, from);
  const next = s.status === "busy" ? s.busyUntil : s.freeUntil;
  return (
    <motion.div
      key={stateId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="size-6" />
          </span>
          <div>
            <p className="font-mono text-2xl font-bold text-foreground">{s.room.id}</p>
            <p className="text-sm text-muted-foreground">
              {s.room.name ?? s.room.type} · Floor {s.room.floor}
            </p>
          </div>
        </div>
        <StatusBadge status={s.status} pulse={s.justFreed} />
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Now
          </dt>
          <dd className="mt-1 font-display text-base font-bold text-foreground">{line.main}</dd>
          {line.sub && <dd className="text-muted-foreground">{line.sub}</dd>}
        </div>
        {s.current && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current class
            </dt>
            <dd className="mt-1 text-foreground">
              {s.current.title}
              {s.current.code && (
                <span className="font-mono text-muted-foreground"> · {s.current.code}</span>
              )}
            </dd>
            <dd className="text-muted-foreground">{s.current.faculty}</dd>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Next change
            </dt>
            <dd className="mt-1 font-mono text-lg font-bold text-foreground">
              {s.status === "offline" ? "—" : fmt(next ?? DAY_END)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Capacity
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-foreground">
              <Users className="size-4 text-muted-foreground" />{" "}
              {s.room.capacity === null ? "Capacity unverified" : `${s.room.capacity} seats`}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-6 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today
        </p>
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-sm">
          {s.bookings.length === 0 && <li className="text-muted-foreground">Nothing scheduled.</li>}
          {s.bookings.map((b, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-3 rounded-lg px-2 py-1",
                b.start <= from && b.end > from && "bg-busy-soft",
              )}
            >
              <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted-foreground">
                {fmt(b.start)}–{fmt(b.end)}
              </span>
              <span className="text-foreground">
                {b.title}
                {b.source === "faculty" && (
                  <span className="text-xs font-semibold text-brand"> · update</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        to="/find"
        search={{ floor: s.room.floor, type: s.room.type }}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        Find similar free rooms <ArrowRight className="size-4" />
      </Link>
    </motion.div>
  );
}
