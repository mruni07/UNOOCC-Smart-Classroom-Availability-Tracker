import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { overlaps, type Booking, type RoomState } from "@/lib/availability";
import { DAY_END, DAY_START, fmt } from "@/lib/time";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60);

interface Cell {
  state: RoomState;
  hour: number;
  bookings: Booking[];
}

export function TimetableGrid({
  states,
  from,
  to,
}: {
  states: RoomState[];
  from: number;
  to: number;
}) {
  const [cell, setCell] = useState<Cell | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Room
              </th>
              {HOURS.map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-1 py-3 text-center font-mono text-xs font-semibold text-muted-foreground",
                    overlaps(h, h + 60, from, to) && "text-brand",
                  )}
                >
                  {fmt(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((s) => (
              <tr key={s.room.id}>
                <td className="sticky left-0 z-10 border-t bg-card px-4 py-2">
                  <p className="font-mono text-sm font-bold text-foreground">{s.room.id}</p>
                  <p className="text-[0.7rem] text-muted-foreground">
                    {s.room.type} · F{s.room.floor}
                  </p>
                </td>
                {HOURS.map((h) => {
                  const bks = s.bookings.filter((b) => overlaps(b.start, b.end, h, h + 60));
                  const inWindow = overlaps(h, h + 60, from, to);
                  const offline = s.status === "offline";
                  const faculty = bks.some((b) => b.source === "faculty");
                  return (
                    <td key={h} className={cn("border-t p-1", inWindow && "bg-brand-soft/60")}>
                      <button
                        type="button"
                        onClick={() => setCell({ state: s, hour: h, bookings: bks })}
                        className={cn(
                          "flex h-11 w-full items-center justify-center rounded-lg border text-[0.68rem] font-semibold transition-transform hover:scale-[1.04] hover:shadow-card",
                          offline
                            ? "border-offline/30 bg-offline-soft text-offline"
                            : bks.length
                              ? faculty
                                ? "border-brand/40 bg-brand-soft text-brand"
                                : "border-busy/30 bg-busy-soft text-busy"
                              : s.room.verified
                                ? "border-free/25 bg-free-soft text-free"
                                : "border-unverified/35 bg-unverified-soft text-unverified",
                        )}
                        aria-label={`${s.room.id} ${fmt(h)}: ${bks[0]?.title ?? "free"}`}
                      >
                        {offline
                          ? "—"
                          : bks.length
                            ? (bks[0]?.code ?? "Update")
                            : s.room.verified
                              ? "✓"
                              : "?"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-free-soft ring-1 ring-free/40" /> Free
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-busy-soft ring-1 ring-busy/40" /> Timetabled class
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-brand-soft ring-1 ring-brand/40" /> Faculty update
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-unverified-soft ring-1 ring-unverified/40" />{" "}
          Unverified
        </span>
        <span className="ml-auto">Tap a cell for details</span>
      </div>

      <Dialog open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <DialogContent className="rounded-2xl">
          {cell && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-2xl">{cell.state.room.id}</DialogTitle>
                <DialogDescription>
                  {cell.state.room.name ?? cell.state.room.type} · Floor {cell.state.room.floor} ·{" "}
                  {fmt(cell.hour)}–{fmt(cell.hour + 60)}
                </DialogDescription>
              </DialogHeader>
              {cell.state.status === "offline" ? (
                <StatusBadge status="offline" />
              ) : cell.bookings.length === 0 ? (
                <div className="space-y-2">
                  <StatusBadge status={cell.state.room.verified ? "free" : "unverified"} />
                  <p className="text-sm text-muted-foreground">
                    No class is scheduled in this hour.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cell.bookings.map((b, i) => (
                    <li key={i} className="rounded-xl border bg-muted/50 p-4">
                      <p className="font-display text-base font-bold text-foreground">{b.title}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-muted-foreground">Time</dt>
                        <dd className="font-mono text-foreground">
                          {fmt(b.start)}–{fmt(b.end)}
                        </dd>
                        {b.code && (
                          <>
                            <dt className="text-muted-foreground">Course code</dt>
                            <dd className="font-mono text-foreground">{b.code}</dd>
                          </>
                        )}
                        {b.section && (
                          <>
                            <dt className="text-muted-foreground">
                              {b.source === "faculty" ? "Notes" : "Section"}
                            </dt>
                            <dd className="text-foreground">{b.section}</dd>
                          </>
                        )}
                        <dt className="text-muted-foreground">Faculty</dt>
                        <dd className="text-foreground">{b.faculty}</dd>
                        <dt className="text-muted-foreground">Source</dt>
                        <dd className="text-foreground">
                          {b.source === "faculty" ? "Faculty update" : "Official timetable"}
                        </dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
