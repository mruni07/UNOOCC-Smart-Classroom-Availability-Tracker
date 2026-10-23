/**
 * Rule-based UNOOCC assistant: understands a plain-language question,
 * then answers using the same availability logic as the rest of the site.
 * Room status is always computed in code — never invented.
 */
import {
  isAvailable,
  roomState,
  sortStates,
  type FacultyUpdate,
  type RoomState,
} from "./availability";
import { type Room, type RoomType, type ScheduleEntry } from "./rooms-data";
import {
  addDays,
  DAY_END,
  DAY_NAMES,
  DAY_START,
  defaultStart,
  fmt,
  fmtDuration,
  longDate,
  type Now,
} from "./time";

export interface ParsedQuery {
  dateISO: string;
  weekday: number;
  from: number;
  dur: number;
  isNow: boolean;
  isToday: boolean;
  floor?: number | undefined;
  unknownFloor?: number | undefined;
  type?: RoomType | undefined;
  cap?: number | undefined;
  roomId?: string | undefined;
}

export interface AssistantAnswer {
  text: string;
  rooms: RoomState[];
  query?: ParsedQuery | undefined;
}

const TYPE_LABEL: Record<RoomType, string> = {
  Classroom: "classrooms",
  Lab: "labs",
  "Seminar Hall": "seminar halls",
  Unclassified: "rooms",
};

export function parseQuery(input: string, now: Now, rooms: Room[] = []): ParsedQuery {
  const text = input.toLowerCase();
  let dateISO = now.dateISO;

  if (/\btomorrow\b/.test(text)) dateISO = addDays(now.dateISO, 1);
  DAY_NAMES.forEach((name, idx) => {
    if (new RegExp(`\\b${name.toLowerCase()}\\b`).test(text)) {
      const diff = (idx - now.weekday + 7) % 7;
      dateISO = addDays(now.dateISO, diff);
    }
  });
  const weekday = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  const isToday = dateISO === now.dateISO;

  let from: number | undefined;
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const clock = text.match(/\b(\d{1,2}):(\d{2})\b/);
  const at = text.match(
    /\b(?:at|from|by)\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:st|nd|rd|th|floor|people|students|seats|hours?|hrs?))/,
  );
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[3] === "pm") h += 12;
    from = h * 60 + Number(ampm[2] ?? 0);
  } else if (clock) {
    from = Number(clock[1]) * 60 + Number(clock[2]);
  } else if (at) {
    let h = Number(at[1]);
    if (h < 8) h += 12;
    from = h * 60 + Number(at[2] ?? 0);
  } else if (/\bmorning\b/.test(text)) from = 9 * 60;
  else if (/\b(afternoon|after lunch)\b/.test(text)) from = 14 * 60;
  else if (/\bevening\b/.test(text)) from = 16 * 60;

  const isNow = from === undefined && isToday;
  if (from === undefined) from = isToday ? defaultStart(now.minutes) : DAY_START;
  from = Math.min(Math.max(from, DAY_START), DAY_END - 15);

  let dur = 60;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  const mins = text.match(/(\d+)\s*(?:minutes?|mins?)\b/);
  if (hours) dur = Math.round(Number(hours[1]) * 60);
  else if (mins) dur = Number(mins[1]);
  else if (/half an hour/.test(text)) dur = 30;
  else if (/(rest of the day|whole day|all day)/.test(text)) dur = DAY_END - from;
  dur = Math.max(15, Math.min(dur, DAY_END - from));

  let floor: number | undefined;
  let unknownFloor: number | undefined;
  const fm =
    text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*floor\b/) ?? text.match(/\bfloor\s*(\d{1,2})\b/);
  const ground = /\bground floor\b/.test(text);
  const requested = ground ? 0 : fm ? Number(fm[1]) : undefined;
  if (requested !== undefined) {
    if (rooms.some((room) => room.floor === requested)) floor = requested;
    else unknownFloor = requested;
  }

  let type: RoomType | undefined;
  if (/\b(labs?|laboratory|laboratories)\b/.test(text)) type = "Lab";
  else if (/\b(seminar|hall|auditorium)\b/.test(text)) type = "Seminar Hall";
  else if (/\b(classrooms?|class rooms?|lecture rooms?)\b/.test(text)) type = "Classroom";

  const capm = text.match(/(\d+)\s*(?:people|students|seats|persons|members)\b/);
  const cap = capm ? Number(capm[1]) : undefined;

  let roomId: string | undefined;
  const rm = text.match(/\b(dt|lab)[\s-]?(\d{3})\b/);
  if (rm) {
    const num = rm[2] ?? "";
    const prefix = rm[1] ?? "dt";
    const exact = rooms.find((r) => r.id.toLowerCase() === `${prefix}-${num}`);
    const loose = rooms.find((r) => r.id.endsWith(num));
    roomId = (exact ?? loose)?.id;
    if (!roomId) roomId = `${prefix === "lab" ? "Lab" : "DT"}-${num}`;
  }

  return { dateISO, weekday, from, dur, isNow, isToday, floor, unknownFloor, type, cap, roomId };
}

function dayPhrase(q: ParsedQuery) {
  if (q.isNow) return "right now";
  const when = q.isToday ? "today" : `on ${longDate(q.dateISO)}`;
  return `${when}, ${fmt(q.from)}–${fmt(q.from + q.dur)}`;
}

export function answerQuestion(
  input: string,
  now: Now,
  updates: FacultyUpdate[],
  favorites: string[] = [],
  rooms: Room[] = [],
  schedule: ScheduleEntry[] = [],
): AssistantAnswer {
  const text = input.trim().toLowerCase();
  if (!text)
    return { text: "Ask me which rooms are free — for example “Free labs right now”.", rooms: [] };

  if (/^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b[\s!.]*$/.test(text)) {
    return {
      text: "Hello! Tell me a time, floor or room type and I’ll find what’s free. Try “Quiet room for 2 hours” or “Is DT-604 free at 3 pm?”.",
      rooms: [],
    };
  }
  if (/\b(thanks|thank you|thx)\b/.test(text)) {
    return { text: "Happy to help. Good luck with your session!", rooms: [] };
  }

  if (!rooms.length)
    return {
      text: "Room data is unavailable right now. Check the connection or ask a coordinator to publish the room catalogue.",
      rooms: [],
    };

  const q = parseQuery(input, now, rooms);
  const win = { dateISO: q.dateISO, weekday: q.weekday, from: q.from, to: q.from + q.dur };
  const notes: string[] = [];

  if (q.weekday === 0)
    notes.push("It’s a Sunday, so no classes are scheduled — the building may be closed.");
  if (q.isNow && now.minutes >= DAY_END)
    notes.push("Classes are over for today, so I checked the last hour of the teaching day.");

  if (q.roomId) {
    const room = rooms.find((r) => r.id === q.roomId);
    if (!room) {
      return {
        text: `${q.roomId} is not in the current room catalogue. Ask a coordinator to check the room master.`,
        rooms: [],
      };
    }
    const s = roomState(room, win, schedule, updates);
    let line = "";
    if (s.status === "offline") line = `${room.id} is not in service at the moment.`;
    else if (s.status === "busy")
      line = `${room.id} is busy ${dayPhrase(q)} with ${s.current?.title}${s.current?.section ? ` (${s.current.section})` : ""}. It frees up at ${fmt(s.busyUntil ?? DAY_END)}.`;
    else {
      const until = s.freeUntil === null ? "for the rest of the day" : `until ${fmt(s.freeUntil)}`;
      line =
        s.status === "free"
          ? `Good news — ${room.id} is free ${dayPhrase(q)} and stays free ${until}.`
          : `${room.id} has no overlapping class in the imported schedule ${dayPhrase(q)} (${until}), but physical availability is not verified; treat it as possibly free.`;
    }
    return { text: [...notes, line].join(" "), rooms: [s], query: q };
  }

  if (q.unknownFloor !== undefined) {
    notes.push(
      `No rooms are listed on floor ${q.unknownFloor}; I searched the current room catalogue instead.`,
    );
  }

  if (
    q.cap &&
    rooms.some(
      (room) => room.capacity === null && (q.floor === undefined || room.floor === q.floor),
    )
  ) {
    return {
      text: "I can't verify seating capacity for all rooms yet. Ask for a floor or room type, or ask a coordinator to verify the room capacities.",
      rooms: [],
      query: q,
    };
  }

  const states = rooms
    .filter(
      (r) =>
        (q.floor === undefined || r.floor === q.floor) &&
        (!q.type || r.type === q.type) &&
        (!q.cap || (r.capacity !== null && r.capacity >= q.cap)),
    )
    .map((r) => roomState(r, win, schedule, updates));
  const free = sortStates(states.filter(isAvailable), q.from, favorites);
  const label = q.type ? TYPE_LABEL[q.type] : "rooms";
  const floorLabel = q.floor !== undefined ? ` on floor ${q.floor}` : "";
  const capLabel = q.cap ? ` for ${q.cap}+ people` : "";

  if (!free.length) {
    return {
      text: [
        ...notes,
        `No ${label}${floorLabel}${capLabel} are free ${dayPhrase(q)}. Try a shorter slot or another floor.`,
      ].join(" "),
      rooms: [],
      query: q,
    };
  }

  const best = free[0]!;
  const bestUntil =
    best.freeUntil === null ? "the rest of the day" : `until ${fmt(best.freeUntil)}`;
  const verified = free.filter((s) => s.status === "free").length;
  const main =
    verified === free.length
      ? `I found ${free.length} ${free.length === 1 ? label.replace(/s$/, "") : label}${floorLabel}${capLabel} free ${dayPhrase(q)}${q.isNow && q.dur !== 60 ? ` for the next ${fmtDuration(q.dur)}` : ""}. ${best.room.id} stays free the longest (${bestUntil}).`
      : `I found ${free.length} ${free.length === 1 ? label.replace(/s$/, "") : label}${floorLabel}${capLabel} with no overlapping class records ${dayPhrase(q)}. This does not confirm physical availability.`;
  const caveat =
    verified < free.length
      ? ` ${free.length - verified} have unverified timetable or room data and should be treated as possibly free.`
      : "";

  return { text: [...notes, main + caveat].join(" "), rooms: free.slice(0, 4), query: q };
}
