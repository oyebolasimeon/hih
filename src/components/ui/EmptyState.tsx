"use client";

import type { ReactNode } from "react";
import { MotionCard } from "@/components/motion/Motion";

export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <MotionCard className="app-card p-8 text-center">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">{description}</p>
      {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
    </MotionCard>
  );
}
