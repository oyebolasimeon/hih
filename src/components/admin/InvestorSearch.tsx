"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InvestorSearch({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery || "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 max-w-lg">
      <input
        className="app-input"
        placeholder="Search by name or email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="app-btn app-btn-secondary">
        Search
      </button>
    </form>
  );
}
