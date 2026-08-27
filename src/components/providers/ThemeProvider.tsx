"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { mutationSilentHeaders } from "@/lib/mutation-fetch";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "hih-theme";

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  initialTheme = "dark",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const { data: session, update } = useSession();
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from session, then localStorage, then default to dark
  useEffect(() => {
    const fromSession = session?.user?.theme;
    if (fromSession === "light" || fromSession === "dark") {
      setThemeState(fromSession);
      setHydrated(true);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
      } else {
        setThemeState("dark");
      }
    } catch {
      setThemeState("dark");
    }
    setHydrated(true);
  }, [session?.user?.theme]);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeClass(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("hih-theme-change", { detail: theme }));
  }, [theme, hydrated]);

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next);
      applyThemeClass(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent("hih-theme-change", { detail: next }));
      try {
        await fetch("/api/account/theme", {
          method: "PATCH",
          headers: mutationSilentHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ theme: next }),
        });
        await update({ theme: next });
      } catch {
        /* keep local preference */
      }
    },
    [update]
  );

  const toggleTheme = useCallback(() => {
    void setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
