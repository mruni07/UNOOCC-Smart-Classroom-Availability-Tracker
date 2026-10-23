/**
 * Room availability rules (from the UNOOCC workbook Read_Me):
 * - A room is busy if any booking that day overlaps the requested window:
 *   start < requestedEnd AND end > requestedStart.
 * - Live faculty updates are checked first and win over the timetable.
 * - A room without verified data is "Possibly free", never "Free".
 */
import type { Room, ScheduleEntry } from "./rooms-data";
import { DAY_END, toMin } from "./time";

export type Status = "free" | "busy" | "unverified" | "offline";

export const UPDATE_REASONS = [
  "Extra lecture",
  "Lab session",
  "Event",
  "Room change",
  "Room free again",
] as const;
export type UpdateReason = (typeof UPDATE_REASONS)[number];

export interface FacultyUpdate {
  id: string;
  name: string;
  facultyId: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  reason: UpdateReason;
  notes?: string | undefined;
  createdAt: string;
  status: "live" | "pending";
}

export interface Booking {
  roomId: string;
  start: number;
  end: number;
  title: string;
  code?: string | undefined;
  section?: string | undefined;
  faculty: string;
  source: "timetable" | "faculty";
  reason?: UpdateReason | undefined;
}

export interface Window {
  dateISO: string;
  weekday: number;
  from: number;
  to: number;
}

export interface RoomState {
  room: Room;
  status: Status;
  current?: Booking | undefined;
  /** Minute the room stops being free; null = free for the rest of the day. */
  freeUntil: number | null;
  /** Minute the room becomes free again (when busy). */
  busyUntil: number | null;
  justFreed: boolean;
  bookings: Booking[];
}

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

export function bookingsFor(
  roomId: string,
  dateISO: string,
  weekday: number,
  schedule: ScheduleEntry[],
  updates: FacultyUpdate[],
): Booking[] {
  const live = updates.filter(
    (u) => u.status === "live" && u.roomId === roomId && u.date === dateISO,
  );
  const freed = live
    .filter((u) => u.reason === "Room free again")
    .map((u) => [toMin(u.start), toMin(u.end)] as const);

  const faculty: Booking[] = live
    .filter((u) => u.reason !== "Room free again")
    .map((u) => ({
      roomId,
      start: toMin(u.start),
      end: toMin(u.end),
      title: u.reason,
      faculty: u.name,
      source: "faculty",
      reason: u.reason,
      section: u.notes,
    }));

  const timetable: Booking[] = schedule
    .filter((e) => e.roomId === roomId && e.day === weekday)
    .map((e) => ({
      roomId,
      start: toMin(e.start),
      end: toMin(e.end),
      title: e.course,
      code: e.code,
      section: e.section,
      faculty: e.faculty,
      source: "timetable" as const,
    }))
    .filter((b) => !freed.some(([s, e]) => overlaps(b.start, b.end, s, e)))
    .filter((b) => !faculty.some((f) => overlaps(b.start, b.end, f.start, f.end)));

  return [...timetable, ...faculty].sort((a, b) => a.start - b.start);
}

export function roomState(
  room: Room,
  win: Window,
  schedule: ScheduleEntry[],
  updates: FacultyUpdate[],
): RoomState {
  const bookings = bookingsFor(room.id, win.dateISO, win.weekday, schedule, updates);
  if (!room.inService) {
    return {
      room,
      status: "offline",
      freeUntil: null,
      busyUntil: null,
      justFreed: false,
      bookings,
    };
  }

  const clash = bookings.filter((b) => overlaps(b.start, b.end, win.from, win.to));
  if (clash.length) {
    const current = clash.find((b) => b.source === "faculty") ?? clash[0];
    let busyUntil = Math.max(...clash.map((b) => b.end));
    for (const b of bookings) {
      if (b.start <= busyUntil && b.end > busyUntil) busyUntil = b.end;
    }
    return {
      room,
      status: "busy",
      current,
      freeUntil: null,
      busyUntil,
      justFreed: false,
      bookings,
    };
  }

  const next = bookings.find((b) => b.start >= win.to);
  const justFreed = bookings.some((b) => b.end <= win.from && win.from - b.end <= 15);
  return {
    room,
    status: room.verified ? "free" : "unverified",
    freeUntil: next ? next.start : null,
    busyUntil: null,
    justFreed,
    bookings,
  };
}

export const isAvailable = (s: RoomState) => s.status === "free" || s.status === "unverified";

export function freeMinutes(s: RoomState, from: number) {
  return (s.freeUntil ?? DAY_END) - from;
}

const RANK: Record<Status, number> = { free: 0, unverified: 1, busy: 2, offline: 3 };

/** Favorites first, then free rooms that stay free the longest, then busy rooms freeing soonest. */
export function sortStates(states: RoomState[], from: number, favorites: string[] = []) {
  return [...states].sort((a, b) => {
    const fa = favorites.includes(a.room.id) ? 0 : 1;
    const fb = favorites.includes(b.room.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    if (isAvailable(a)) return freeMinutes(b, from) - freeMinutes(a, from);
    if (a.status === "busy") return (a.busyUntil ?? 0) - (b.busyUntil ?? 0);
    return a.room.id.localeCompare(b.room.id);
  });
}
