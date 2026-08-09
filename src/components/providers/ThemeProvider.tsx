"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
}

export function ThemeProvider({
  children,
  initialTheme = "dark",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const { data: session, update } = useSession();
  const [theme, setThemeState] = useState<Theme>(
    session?.user?.theme || initialTheme
  );

  useEffect(() => {
    if (session?.user?.theme) {
      setThemeState(session.user.theme);
    }
  }, [session?.user?.theme]);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Restore marketing/light tokens when leaving portal/admin (unmount only)
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark", "light");
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next);
      applyThemeClass(next);
      try {
        await fetch("/api/account/theme", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        });
        await update({ theme: next });
      } catch {
        // Keep local preference even if persistence fails
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
