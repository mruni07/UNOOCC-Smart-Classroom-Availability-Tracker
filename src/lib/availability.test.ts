import { describe, expect, it } from "vitest";
import { roomState, overlaps, sortStates, type FacultyUpdate } from "./availability";
import type { Room, ScheduleEntry } from "./rooms-data";
import { toMin } from "./time";

const room = (id: string, extra: Partial<Room> = {}): Room => ({
  id,
  building: "Digital Tower",
  floor: 6,
  type: "Classroom",
  capacity: 60,
  verified: true,
  inService: true,
  row: "top",
  span: 1,
  ...extra,
});

const entry = (roomId: string, start: string, end: string): ScheduleEntry => ({
  roomId,
  day: 5,
  start,
  end,
  course: "DBMS",
  code: "CS2203",
  section: "V-A",
  faculty: "Prof. X",
});

const win = (from: string, to: string) => ({
  dateISO: "2026-10-23",
  weekday: 5,
  from: toMin(from),
  to: toMin(to),
});

const update = (extra: Partial<FacultyUpdate>): FacultyUpdate => ({
  id: "u1",
  name: "Prof. Y",
  facultyId: "F1",
  roomId: "DT-606",
  date: "2026-10-23",
  start: "11:00",
  end: "12:00",
  reason: "Extra lecture",
  createdAt: "",
  status: "live",
  ...extra,
});

describe("availability rules", () => {
  it("treats a class ending at 11:00 as free for an 11:00–12:00 search", () => {
    const s = roomState(
      room("DT-606"),
      win("11:00", "12:00"),
      [entry("DT-606", "10:00", "11:00")],
      [],
    );
    expect(s.status).toBe("free");
  });

  it("marks a lab spanning 13:00–14:00 busy for 13:30–14:30", () => {
    const s = roomState(
      room("Lab-610", { type: "Lab" }),
      win("13:30", "14:30"),
      [entry("Lab-610", "13:00", "14:00")],
      [],
    );
    expect(s.status).toBe("busy");
    expect(s.busyUntil).toBe(toMin("14:00"));
  });

  it("uses the overlap rule start < end AND end > start", () => {
    expect(overlaps(600, 660, 660, 720)).toBe(false);
    expect(overlaps(600, 661, 660, 720)).toBe(true);
  });

  it("lets a faculty extra lecture make a free room busy", () => {
    const s = roomState(room("DT-606"), win("11:00", "12:00"), [], [update({})]);
    expect(s.status).toBe("busy");
    expect(s.current?.source).toBe("faculty");
  });

  it("lets a faculty 'Room free again' update override the timetable", () => {
    const s = roomState(
      room("DT-606"),
      win("11:00", "12:00"),
      [entry("DT-606", "11:00", "12:00")],
      [update({ reason: "Room free again" })],
    );
    expect(s.status).toBe("free");
  });

  it("ignores faculty updates still pending approval", () => {
    const s = roomState(room("DT-606"), win("11:00", "12:00"), [], [update({ status: "pending" })]);
    expect(s.status).toBe("free");
  });

  it("shows an unverified room as possibly free, never free", () => {
    const s = roomState(room("DT-405", { verified: false }), win("11:00", "12:00"), [], []);
    expect(s.status).toBe("unverified");
  });

  it("reports free until the next class starts", () => {
    const s = roomState(
      room("DT-606"),
      win("09:00", "10:00"),
      [entry("DT-606", "13:00", "14:00")],
      [],
    );
    expect(s.freeUntil).toBe(toMin("13:00"));
  });

  it("sorts the room that stays free longest first", () => {
    const w = win("09:00", "10:00");
    const a = roomState(room("A"), w, [entry("A", "10:00", "11:00")], []);
    const b = roomState(room("B"), w, [], []);
    expect(sortStates([a, b], w.from).map((s) => s.room.id)).toEqual(["B", "A"]);
  });
});
