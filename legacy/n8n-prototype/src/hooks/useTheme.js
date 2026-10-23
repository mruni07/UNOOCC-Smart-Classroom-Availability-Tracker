import { useState, useEffect } from "react";

/**
 * Hook that manages the dark / light theme.
 * Persists choice in localStorage and syncs the `dark` class on <html>.
 */
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  return { dark, toggle };
}
