"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfileType } from "@/models/Profile";

type ActiveProfile = {
  id: string;
  type: ProfileType;
  displayName: string;
  status: string;
};

export function useActiveProfile() {
  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/profiles");
      const data = await res.json();
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const activeId = data.activeProfileId as string | null;
      const profiles = (data.profiles || []) as ActiveProfile[];
      const active = profiles.find((p) => p.id === activeId) || profiles[0] || null;
      setProfile(active);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    profile,
    profileType: profile?.type ?? null,
    loading,
    refresh,
    isLandlordLike:
      profile?.type === "landlord" || profile?.type === "estate_manager",
    isTenantLike: profile?.type === "tenant" || profile?.type === "student",
  };
}
