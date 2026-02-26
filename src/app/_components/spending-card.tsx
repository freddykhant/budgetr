"use client";

import Link from "next/link";

function CircularProgress({
  value,
  total,
  color,
  size = 92,
  strokeWidth = 7,
}: {
  value: number;
  total: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const safeTotal = total || 1;
  const pct = Math.min(100, (value / safeTotal) * 100);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/[0.07]"
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={`${color.replace("bg-", "stroke-")} transition-all duration-500`}
      />
    </svg>
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
        <div className="flex items-center gap-5">
          <div className="h-[92px] w-[92px] shrink-0 animate-pulse rounded-full bg-white/6" />
          <div className="space-y-2">
            <div className="h-6 w-28 animate-pulse rounded-md bg-white/5" />
            <div className="h-3 w-32 animate-pulse rounded-md bg-white/4" />
            <div className="h-3 w-20 animate-pulse rounded-md bg-white/5" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="h-5 w-20 animate-pulse rounded-full bg-white/6" />
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
      <div className="my-4 flex items-center gap-5">
        <div className="relative flex shrink-0 items-center justify-center">
          <CircularProgress value={spent} total={safeLimit} color={barColor} />
          <span className="absolute text-sm font-semibold tabular-nums text-white">
            {usedPct}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {fmt(spent)}
          </p>
          <p className="text-xs text-neutral-500">of {fmt(limit)} limit</p>
          <p className="text-xs text-neutral-600">{fmt(remaining)} left</p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </Card>
  );
}

