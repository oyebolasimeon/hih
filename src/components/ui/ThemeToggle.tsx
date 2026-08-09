"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`text-xs font-medium ${
          !isDark ? "text-foreground" : "text-muted"
        }`}
      >
        Light
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          isDark
            ? "border-brand/40 bg-brand"
            : "border-border bg-surface-dark"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow transition-transform duration-200 ${
            isDark ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {isDark ? (
            <svg className="h-3 w-3 text-foreground" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="h-3 w-3 text-foreground" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.03a1 1 0 011.42 1.42l-.7.7a1 1 0 11-1.42-1.42l.7-.7zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM14.95 14.95a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 111.42-1.42l.7.7zM10 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 011.42-1.42l.7.7a1 1 0 11-1.42 1.42l-.7-.7zM4 10a1 1 0 01-1-1 1 1 0 112 0 1 1 0 01-1 1zm.7-5.66a1 1 0 011.42-.1l.7.7A1 1 0 015.4 6.36l-.7-.7a1 1 0 01-.1-1.32zM10 6a4 4 0 100 8 4 4 0 000-8z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>
      <span
        className={`text-xs font-medium ${
          isDark ? "text-foreground" : "text-muted"
        }`}
      >
        Dark
      </span>
    </div>
  );
}
