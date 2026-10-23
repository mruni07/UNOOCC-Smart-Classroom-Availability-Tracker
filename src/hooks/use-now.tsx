import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { nowInKolkata, type Now } from "@/lib/time";

interface NowContextValue {
  now: Now | null;
  updatedAt: number | null;
  refreshing: boolean;
  refresh: () => void;
}

const NowContext = createContext<NowContextValue>({
  now: null,
  updatedAt: null,
  refreshing: false,
  refresh: () => {},
});

/** Shares the current Asia/Kolkata time; re-checks every 60 seconds. */
export function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Now | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const tick = useCallback(() => {
    setNow(nowInKolkata());
    setUpdatedAt(Date.now());
  }, []);

  useEffect(() => {
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [tick]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    window.setTimeout(() => {
      tick();
      setRefreshing(false);
    }, 650);
  }, [tick]);

  const value = useMemo(
    () => ({ now, updatedAt, refreshing, refresh }),
    [now, updatedAt, refreshing, refresh],
  );
  return <NowContext.Provider value={value}>{children}</NowContext.Provider>;
}

export const useNow = () => useContext(NowContext);
