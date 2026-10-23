import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronDown, FlaskConical, MapPin, Presentation, School, Star, Users } from "lucide-react";
import { useState } from "react";
import type { RoomState } from "@/lib/availability";
import { actions, useStore } from "@/lib/store";
import { DAY_END, DAY_START, fmt, fmtDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export const TYPE_ICON = {
  Classroom: School,
  Lab: FlaskConical,
  "Seminar Hall": Presentation,
  Unclassified: School,
} as const;

export function statusLine(s: RoomState, from: number) {
  if (s.status === "offline") return { main: "Not in service", sub: "Closed for maintenance" };
  if (s.status === "busy") {
    const c = s.current;
    return {
      main: `Busy until ${fmt(s.busyUntil ?? DAY_END)}`,
      sub: c
        ? c.source === "faculty"
          ? `Faculty update · ${c.title} · ${c.faculty}`
          : `${c.title}${c.section ? ` · ${c.section}` : ""}`
        : "",
    };
  }
  const mins = (s.freeUntil ?? DAY_END) - from;
  const main =
    s.freeUntil === null ? "Free for the rest of the day" : `Free until ${fmt(s.freeUntil)}`;
  return {
    main: s.status === "unverified" ? `Possibly ${main.toLowerCase()}` : main,
    sub:
      s.status === "unverified"
        ? "Physical availability not verified"
        : `${fmtDuration(mins)} free`,
  };
}

export function MiniTimeline({ state, from, to }: { state: RoomState; from: number; to: number }) {
  const span = DAY_END - DAY_START;
  const pct = (m: number) =>
    `${((Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) / span) * 100}%`;
  return (
    <div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-free-soft">
        {state.status === "offline" && <div className="absolute inset-0 bg-offline-soft" />}
        {state.bookings.map((b, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-y-0",
              b.source === "faculty" ? "stripes-brand" : "bg-busy/80",
            )}
            style={{ left: pct(b.start), width: `calc(${pct(b.end)} - ${pct(b.start)})` }}
            title={`${fmt(b.start)}–${fmt(b.end)} ${b.title}`}
          />
        ))}
        <div
          className="absolute inset-y-0 border-x-2 border-foreground bg-foreground/20"
          style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-foreground">
        <span>09</span>
        <span>12</span>
        <span>15</span>
        <span>18</span>
      </div>
    </div>
  );
}

export function RoomCard({ state, from, to }: { state: RoomState; from: number; to: number }) {
  const favorites = useStore((s) => s.favorites);
  const fav = favorites.includes(state.room.id);
  const [open, setOpen] = useState(false);
  const { room } = state;
  const Icon = TYPE_ICON[room.type];
  const line = statusLine(state, from);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "group card-lift flex flex-col rounded-2xl border bg-card p-5 shadow-card",
        state.status === "offline" && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="font-mono text-lg font-bold leading-tight text-foreground">{room.id}</h3>
            <p className="text-xs text-muted-foreground">
              {room.name ?? room.type} · Floor {room.floor}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => actions.toggleFavorite(room.id)}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${room.id} from favourites` : `Add ${room.id} to favourites`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-brand"
        >
          <Star
            className={cn("size-5 transition-transform", fav && "scale-110 fill-brand text-brand")}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={state.status} pulse={state.justFreed && state.status === "free"} />
        {state.justFreed && state.status === "free" && (
          <span className="text-xs font-medium text-free">Just freed up</span>
        )}
      </div>
      <p className="mt-3 font-display text-base font-bold text-foreground">{line.main}</p>
      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{line.sub}</p>

      <div className="mt-4">
        <MiniTimeline state={state} from={from} to={to} />
      </div>

      {open && (
        <ul className="mt-4 space-y-1.5 border-t pt-3 text-sm">
          {state.bookings.length === 0 && (
            <li className="text-muted-foreground">Nothing booked this day.</li>
          )}
          {state.bookings.map((b, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {fmt(b.start)}–{fmt(b.end)}
              </span>
              <span className="text-foreground">
                {b.title}
                {b.source === "faculty" && (
                  <span className="ml-1 text-xs font-semibold text-brand">· faculty update</span>
                )}
                {b.section && b.source === "timetable" && (
                  <span className="text-muted-foreground"> · {b.section}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-4" />{" "}
          {room.capacity === null ? "Capacity unverified" : `${room.capacity} seats`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={open}
          >
            Day plan{" "}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
          <Link
            to="/map"
            search={{ floor: room.floor, room: room.id }}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
          >
            <MapPin className="size-3.5" /> View on map
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function CompactRoomCard({ state, from }: { state: RoomState; from: number }) {
  const line = statusLine(state, from);
  return (
    <Link
      to="/map"
      search={{ floor: state.room.floor, room: state.room.id }}
      className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card"
    >
      <div className="min-w-0">
        <p className="font-mono text-sm font-bold text-foreground">{state.room.id}</p>
        <p className="truncate text-xs text-muted-foreground">
          {line.main} · Floor {state.room.floor}
        </p>
      </div>
      <StatusBadge status={state.status} className="shrink-0" />
    </Link>
  );
}
