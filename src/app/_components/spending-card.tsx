"use client";

import Link from "next/link";

function CircularProgress({
  value,
  total,
  color,
  size = 96,
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
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-orange-100"
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
    <div className={`rounded-2xl border p-6 shadow-sm ${className}`}>
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
  let statusClass = "bg-green-100 text-green-700";

  if (usedPct > 85) {
    statusLabel = "over budget";
    statusClass = "bg-red-100 text-red-600";
  } else if (usedPct > 60) {
    statusLabel = "watch spending";
    statusClass = "bg-amber-100 text-amber-700";
  }

  // When the parent is still loading real data, show a skeleton variant.
  if (!Number.isFinite(limit)) {
    return (
      <Card
        className={`border-orange-200 bg-orange-50/50 shadow-orange-900/5 ${className ?? ""}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-sm uppercase tracking-[0.16em] text-green-600">
              <span className="mr-1 text-base">💸</span>
              spending
            </span>
          </div>
          <div className="h-3.5 w-12 animate-pulse rounded-full bg-green-100" />
        </div>
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-green-100" />
          <div className="space-y-2">
            <div className="h-7 w-28 animate-pulse rounded-md bg-green-100" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-green-50" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-green-100" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="h-6 w-20 animate-pulse rounded-full bg-green-100" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`border-orange-200 bg-orange-50/50 shadow-orange-900/5 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-sm uppercase tracking-[0.16em] text-green-600">
            <span className="mr-1 text-base">💸</span>
            spending
          </span>
        </div>
        <Link
          href="/spending"
          className="text-sm text-green-500 transition hover:text-green-700"
        >
          view
        </Link>
      </div>
      <div className="my-4 flex items-center gap-5">
        <div className="relative flex shrink-0 items-center justify-center">
          <CircularProgress value={spent} total={safeLimit} color={barColor} />
          <span className="absolute text-base font-semibold tabular-nums text-orange-600">
            {usedPct}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">
            {fmt(spent)}
          </p>
          <p className="text-sm text-green-600">of {fmt(limit)} limit</p>
          <p className="text-sm text-green-500">{fmt(remaining)} left</p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </Card>
  );
}
