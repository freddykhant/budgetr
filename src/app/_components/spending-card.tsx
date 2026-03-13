"use client";

import Link from "next/link";

function CircularProgress({
  spendPct,
  monthPct,
  size = 88,
  strokeWidth = 7,
}: {
  spendPct: number;
  monthPct: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;

  const spendOffset = circumference - (Math.min(100, spendPct) / 100) * circumference;
  const monthOffset = circumference - (Math.min(100, monthPct) / 100) * circumference;

  const spendColor =
    spendPct > monthPct + 10
      ? "stroke-red-400"
      : spendPct > monthPct
        ? "stroke-amber-400"
        : "stroke-orange-400";

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-orange-100" />
      {/* Month elapsed ghost ring */}
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={2}
        strokeDasharray={circumference} strokeDashoffset={monthOffset} strokeLinecap="round"
        className="text-green-300 opacity-60 transition-all duration-700"
      />
      {/* Spend ring */}
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={spendOffset} strokeLinecap="round"
        className={`${spendColor} transition-all duration-700`}
      />
    </svg>
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
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth);
  const monthElapsedPct = (dayOfMonth / daysInMonth) * 100;

  const safeLimit = limit || 1;
  const usedPct = Math.min(100, (spent / safeLimit) * 100);
  const remaining = Math.max(0, limit - spent);
  const overspent = spent > limit;

  // The number that actually drives decisions: how much per day from here
  const dailyAllowance = remaining / daysLeft;

  // Pace: expected spend at this point in the month
  const expectedSpend = limit * (dayOfMonth / daysInMonth);
  const spendDelta = expectedSpend - spent; // positive = under expected = ahead
  const dailyRate = limit / daysInMonth;
  const daysDelta = dailyRate > 0 ? Math.round(Math.abs(spendDelta) / dailyRate) : 0;
  const isAhead = spendDelta > 0 && !overspent;
  const isBehind = spendDelta < -limit * 0.05; // >5% over expected

  // Loading state
  if (!Number.isFinite(limit)) {
    return (
      <div className={`rounded-2xl border border-orange-200 bg-orange-50/50 p-6 shadow-sm shadow-orange-900/5 ${className ?? ""}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-sm uppercase tracking-[0.16em] text-green-600">
              <span className="mr-1 text-base">💸</span>spending
            </span>
          </div>
          <div className="h-3.5 w-12 animate-pulse rounded-full bg-green-100" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded-full bg-green-100" />
          <div className="space-y-2">
            <div className="h-8 w-24 animate-pulse rounded-md bg-green-100" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-green-50" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-green-100" />
          </div>
        </div>
        <div className="mt-5 h-px bg-orange-100" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-12 animate-pulse rounded-xl bg-green-50" />
          <div className="h-12 animate-pulse rounded-xl bg-green-50" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-orange-200 bg-orange-50/50 p-6 shadow-sm shadow-orange-900/5 ${className ?? ""}`}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-sm uppercase tracking-[0.16em] text-green-600">
            <span className="mr-1 text-base">💸</span>spending
          </span>
        </div>
        <Link href="/spending" className="cursor-pointer text-sm text-green-500 transition hover:text-green-700">
          view →
        </Link>
      </div>

      {/* Hero: ring + daily allowance */}
      <div className="flex items-center gap-4">
        <div className="relative flex shrink-0 items-center justify-center">
          <CircularProgress spendPct={usedPct} monthPct={monthElapsedPct} />
          <span className="absolute text-sm font-semibold tabular-nums text-orange-600">
            {Math.round(usedPct)}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {overspent ? (
            <>
              <p className="text-xs uppercase tracking-[0.14em] text-red-400">over budget</p>
              <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums leading-none text-red-500">
                {fmt(spent - limit)}
              </p>
              <p className="mt-1 text-sm text-green-500">over your {fmt(limit)} limit</p>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.14em] text-green-500">today&apos;s allowance</p>
              <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums leading-none text-green-950">
                {fmt(dailyAllowance)}
                <span className="ml-1 text-base font-normal text-green-500">/day</span>
              </p>
              <p className="mt-1 text-sm text-green-500">
                {fmt(remaining)} left · {daysLeft}d remaining
              </p>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-orange-100" />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/60 px-3 py-2.5">
          <p className="text-xs text-green-500">spent</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-950">
            {fmt(spent)}
            <span className="ml-1 font-normal text-green-400">/ {fmt(limit)}</span>
          </p>
        </div>

        {/* Pace chip */}
        <div className={`rounded-xl px-3 py-2.5 ${
          overspent
            ? "bg-red-50"
            : isAhead
              ? "bg-green-50"
              : isBehind
                ? "bg-amber-50"
                : "bg-white/60"
        }`}>
          <p className={`text-xs ${
            overspent ? "text-red-400" : isAhead ? "text-green-500" : isBehind ? "text-amber-500" : "text-green-500"
          }`}>pace</p>
          <p className={`mt-0.5 text-sm font-semibold ${
            overspent ? "text-red-500" : isAhead ? "text-green-700" : isBehind ? "text-amber-600" : "text-green-700"
          }`}>
            {overspent
              ? "over limit"
              : daysDelta === 0
                ? "on pace"
                : isAhead
                  ? `${daysDelta}d ahead`
                  : `${daysDelta}d behind`}
          </p>
        </div>
      </div>
    </div>
  );
}
