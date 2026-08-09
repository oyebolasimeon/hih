"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-8 w-[3.75rem] items-center rounded-full border border-border bg-surface p-0.5 transition-colors hover:border-brand/50 ${className}`}
    >
      <span
        className={`absolute left-1.5 text-[10px] font-semibold tracking-wide transition-opacity ${
          isDark ? "opacity-40 text-muted" : "opacity-100 text-foreground"
        }`}
      >
        L
      </span>
      <span
        className={`absolute right-1.5 text-[10px] font-semibold tracking-wide transition-opacity ${
          isDark ? "opacity-100 text-foreground" : "opacity-40 text-muted"
        }`}
      >
        D
      </span>
      <span
        className={`relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[#0c0d0b] shadow transition-transform duration-200 ${
          isDark ? "translate-x-[1.85rem]" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.03a1 1 0 011.42 1.42l-.7.7a1 1 0 11-1.42-1.42l.7-.7zM17 9a1 1 0 110 2h-1a1 1 0 110-2h1zM14.95 14.95a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 111.42-1.42l.7.7zM10 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 011.42-1.42l.7.7a1 1 0 11-1.42 1.42l-.7-.7zM4 10a1 1 0 01-1-1 1 1 0 112 0 1 1 0 01-1 1zm.7-5.66a1 1 0 011.42-.1l.7.7A1 1 0 015.4 6.36l-.7-.7a1 1 0 01-.1-1.32zM10 6a4 4 0 100 8 4 4 0 000-8z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
