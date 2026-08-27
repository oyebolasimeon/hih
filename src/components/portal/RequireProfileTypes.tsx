"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { ProfileType } from "@/models/Profile";

type Props = {
  types: ProfileType[];
  children: ReactNode;
  title?: string;
  description?: string;
};

export default function RequireProfileTypes({
  types,
  children,
  title = "Wrong profile type",
  description,
}: Props) {
  const { profileType, loading } = useActiveProfile();

  if (loading) return <FormSkeleton />;

  if (!profileType || !types.includes(profileType)) {
    return (
      <EmptyState
        title={title}
        description={
          description ||
          `Switch to a ${types.map((t) => t.replace("_", " ")).join(" or ")} profile to use this page.`
        }
      >
        <Link href="/portal/profiles" className="app-btn app-btn-primary text-sm">
          Manage profiles
        </Link>
      </EmptyState>
    );
  }

  return <>{children}</>;
}
