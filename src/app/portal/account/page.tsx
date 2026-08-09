"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">Account</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your appearance preference. Theme syncs across devices.
        </p>
      </div>

      <div className="app-card p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Name</p>
          <p className="mt-1 font-medium">{session?.user?.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Email</p>
          <p className="mt-1 font-medium">{session?.user?.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Theme</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`app-btn ${theme === "dark" ? "app-btn-primary" : "app-btn-secondary"}`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`app-btn ${theme === "light" ? "app-btn-primary" : "app-btn-secondary"}`}
            >
              Light
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
