import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useNow } from "@/hooks/use-now";
import { useRoomStates } from "@/hooks/use-room-states";
import { useStore } from "@/lib/store";
import { DAY_END } from "@/lib/time";

/** Toasts "DT-606 is now free" when a starred room changes from busy to free. */
export function FavoriteAlerts() {
  const { now } = useNow();
  const favorites = useStore((s) => s.favorites);
  const win = useMemo(
    () =>
      now && now.minutes < DAY_END
        ? { dateISO: now.dateISO, weekday: now.weekday, from: now.minutes, to: now.minutes + 1 }
        : null,
    [now],
  );
  const states = useRoomStates(win);
  const prev = useRef<Record<string, string>>({});

  useEffect(() => {
    states.forEach((s) => {
      const before = prev.current[s.room.id];
      if (
        favorites.includes(s.room.id) &&
        before === "busy" &&
        (s.status === "free" || s.status === "unverified")
      ) {
        toast.success(`${s.room.id} is now free`, {
          description: "One of your starred rooms just opened up.",
        });
      }
      prev.current[s.room.id] = s.status;
    });
  }, [states, favorites]);

  return null;
}
