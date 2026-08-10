"use client";

import { MotionCard } from "@/components/motion/Motion";

export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <MotionCard className="app-card app-card-interactive p-5">
      <p className="text-xs uppercase tracking-wider text-muted font-medium">
        {label}
      </p>
      <p className="app-stat mt-2 text-2xl font-semibold text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </MotionCard>
  );
}
