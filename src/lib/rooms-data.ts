/**
 * Room and schedule types used by the Supabase-backed availability interface.
 * Keep compatibility exports empty; runtime room data is loaded from Supabase.
 */

export type RoomType = "Classroom" | "Lab" | "Seminar Hall" | "Unclassified";
export const ROOM_TYPES: RoomType[] = ["Classroom", "Lab", "Seminar Hall"];

export interface Room {
  id: string;
  name?: string | undefined;
  building: string;
  floor: number;
  type: RoomType;
  capacity: number | null;
  verified: boolean;
  inService: boolean;
  metadataVerified?: boolean | undefined;
  /** Floor-plan placement: which side of the corridor and relative width. */
  row: "top" | "bottom";
  span: number;
}

export const BUILDING = "Digital Tower";
export const FLOORS: number[] = [];

// Runtime records come from Supabase; these remain empty for legacy imports only.
export const ROOMS: Room[] = [];
export const ROOM_BY_ID: Partial<Record<string, Room>> = {};
export const floorOf = (id: string) => Number(id.match(/(?:^|-)(\d{1,2})\d{2}$/)?.[1] ?? 0);

export interface ScheduleEntry {
  roomId: string;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  start: string;
  end: string;
  course: string;
  code: string;
  section: string;
  batch?: string | null | undefined;
  faculty: string;
}

export const SCHEDULE: ScheduleEntry[] = [];
