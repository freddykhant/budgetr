"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#111111] p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SpendingCard({
  className,
  spent,
  limit,
}: {
  className?: string;
  spent: number;
  limit: number;
}) {
  const usedPct = Math.min(100, Math.round((spent / limit) * 100));
  const remaining = limit - spent;

  const color =
    usedPct > 90 ? "bg-red-400" : usedPct > 70 ? "bg-amber-400" : "bg-orange-400";

  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-neutral-500" strokeWidth={1.5} />
          <span className="text-sm font-medium">spending</span>
        </div>
        <Link
          href="/spending"
          className="text-xs text-neutral-600 transition hover:text-neutral-300"
        >
          view
        </Link>
      </div>
      <p className="font-mono text-3xl font-semibold tabular-nums">
        {fmt(spent)}
      </p>
      <p className="mt-1 text-xs text-neutral-500">of {fmt(limit)} limit</p>
      <div className="my-4">
        <Bar value={spent} total={limit} color={color} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-600">{usedPct}% used</span>
        <span
          className={`text-xs font-medium tabular-nums ${
            usedPct > 90
              ? "text-red-400"
              : usedPct > 70
                ? "text-amber-400"
                : "text-emerald-400"
          }`}
        >
          {fmt(remaining)} left
        </span>
      </div>
    </Card>
  );
}

