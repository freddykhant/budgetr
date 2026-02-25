"use client";

import Link from "next/link";

function Bar({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  color: string;
}) {
  const safeTotal = total || 1;
  const pct = Math.min(100, Math.round((value / safeTotal) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
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
    <div className={`rounded-2xl border p-6 ${className}`}>
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
  const safeLimit = limit || 1;
  const usedPct = Math.min(100, Math.round((spent / safeLimit) * 100));
  const remaining = limit - spent;

  const barColor =
    usedPct > 90 ? "bg-red-400" : usedPct > 70 ? "bg-amber-400" : "bg-orange-400";

  let statusLabel = "on track";
  let statusClass = "bg-emerald-400/10 text-emerald-300";

  if (usedPct > 85) {
    statusLabel = "over budget";
    statusClass = "bg-red-400/10 text-red-300";
  } else if (usedPct > 60) {
    statusLabel = "watch spending";
    statusClass = "bg-amber-400/10 text-amber-300";
  }

  // When the parent is still loading real data, show a skeleton variant.
  if (!Number.isFinite(limit)) {
    return (
      <Card
        className={`border-orange-400/20 bg-orange-400/[0.03] ${className ?? ""}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-400">
              <span className="mr-1 text-sm">💸</span>
              spending
            </span>
          </div>
          <div className="h-3 w-10 animate-pulse rounded-full bg-white/[0.06]" />
        </div>
        <div className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-md bg-white/[0.06]" />
          <div className="h-3 w-32 animate-pulse rounded-md bg-white/[0.04]" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.05]" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 animate-pulse rounded-md bg-white/[0.05]" />
            <div className="h-4 w-20 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`border-orange-400/20 bg-orange-400/[0.03] ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="text-xs uppercase tracking-[0.16em] text-neutral-400">
            <span className="mr-1 text-sm">💸</span>
            spending
          </span>
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
        <Bar value={spent} total={safeLimit} color={barColor} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-600">
          {fmt(remaining)} left
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </Card>
  );
}

