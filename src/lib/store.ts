/**
 * Client-side UI state. Only preferences persist locally; room and timetable data come from Supabase.
 */
import { useSyncExternalStore } from "react";
import type { FacultyUpdate } from "./availability";
import type { Room, ScheduleEntry } from "./rooms-data";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  role: string;
  topic: string;
  roomId?: string;
  issue?: string;
  message: string;
  createdAt: string;
}

export interface AppState {
  updates: FacultyUpdate[];
  favorites: string[];
  messages: ContactMessage[];
  approvalMode: boolean;
  assistantOpen: boolean;
  theme: "light" | "dark";
  rooms: Room[];
  schedule: ScheduleEntry[];
  timetableStatus: "loading" | "ready" | "error";
  timetableError?: string | undefined;
}

const KEY = "unocc-state-v1";

const initial: AppState = {
  updates: [],
  favorites: [],
  messages: [],
  approvalMode: false,
  assistantOpen: false,
  theme: "light",
  rooms: [],
  schedule: [],
  timetableStatus: "loading",
};

let state: AppState = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      // Faculty updates and messages live in the cloud database, not the browser.
      state = {
        ...initial,
        ...parsed,
        updates: [],
        messages: [],
        assistantOpen: false,
        rooms: [],
        schedule: [],
        timetableStatus: "loading",
      };
    }
  } catch {
    state = { ...initial };
  }
  if (document.documentElement.classList.contains("dark")) state = { ...state, theme: "dark" };
}

function persist() {
  try {
    const {
      assistantOpen: _a,
      updates: _u,
      messages: _m,
      rooms: _rooms,
      schedule: _schedule,
      timetableStatus: _ts,
      timetableError: _te,
      ...rest
    } = state;
    window.localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage unavailable */
  }
}

export function getState() {
  load();
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  load();
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Selectors must return existing references (no new arrays/objects). */
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(initial),
  );
}

export const actions = {
  toggleFavorite(id: string) {
    setState((s) => ({
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((f) => f !== id)
        : [...s.favorites, id],
    }));
  },
  addUpdate(u: FacultyUpdate) {
    setState((s) => ({ updates: [u, ...s.updates] }));
  },
  approveUpdate(id: string) {
    setState((s) => ({
      updates: s.updates.map((u) => (u.id === id ? { ...u, status: "live" as const } : u)),
    }));
  },
  removeUpdate(id: string) {
    setState((s) => ({ updates: s.updates.filter((u) => u.id !== id) }));
  },
  addMessage(m: ContactMessage) {
    setState((s) => ({ messages: [m, ...s.messages] }));
  },
  setAssistantOpen(open: boolean) {
    setState({ assistantOpen: open });
  },
  setTheme(theme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    setState({ theme });
  },
};

export const uid = () => Math.random().toString(36).slice(2, 10);
