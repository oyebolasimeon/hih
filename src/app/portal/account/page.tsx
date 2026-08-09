"use client";

import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AccountPage() {
  const { data: session } = useSession();

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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Theme</p>
            <p className="mt-1 text-sm text-muted">Toggle light / dark mode</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
