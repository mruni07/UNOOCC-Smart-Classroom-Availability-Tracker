import { useMemo } from "react";
import { roomState, type RoomState, type Window } from "@/lib/availability";
import type { Room } from "@/lib/rooms-data";
import { useStore } from "@/lib/store";

export function useRoomStates(win: Window | null, rooms?: Room[]): RoomState[] {
  const updates = useStore((s) => s.updates);
  const databaseRooms = useStore((s) => s.rooms);
  const schedule = useStore((s) => s.schedule);
  const selectedRooms = rooms ?? databaseRooms;
  return useMemo(
    () => (win ? selectedRooms.map((r) => roomState(r, win, schedule, updates)) : []),
    [win?.dateISO, win?.weekday, win?.from, win?.to, selectedRooms, schedule, updates], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
