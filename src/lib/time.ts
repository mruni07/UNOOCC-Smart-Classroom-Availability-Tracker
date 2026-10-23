/** Time helpers. All "now" values are computed in Asia/Kolkata. */

export const DAY_START = 9 * 60;
export const DAY_END = 18 * 60;
export const TIMEZONE = "Asia/Kolkata";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m || 0);
};

export const fmt = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const fmt12 = (m: number) => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return mm ? `${h}:${pad(mm)} ${ap}` : `${h} ${ap}`;
};

export const fmtDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export interface Now {
  dateISO: string;
  weekday: number;
  minutes: number;
}

export const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function nowInKolkata(date = new Date()): Now {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    dateISO,
    weekday: weekdayOf(dateISO),
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

export function dateLabel(iso: string, todayISO?: string) {
  if (todayISO && iso === todayISO) return "Today";
  if (todayISO && iso === addDays(todayISO, 1)) return "Tomorrow";
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function longDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAY_NAMES[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Round the current time down to 15 minutes and clamp it into the teaching day. */
export function defaultStart(minutes: number) {
  const r = Math.floor(minutes / 15) * 15;
  return Math.min(Math.max(r, DAY_START), DAY_END - 60);
}
