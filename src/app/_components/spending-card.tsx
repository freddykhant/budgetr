"use client";

import { useState } from "react";
import Link from "next/link";

function CircularProgress({
  spendPct,
  monthPct,
  size = 112,
  strokeWidth = 8,
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
    spendPct > monthPct + 10 ? "stroke-red-400" : spendPct > monthPct ? "stroke-amber-400" : "stroke-orange-400";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-orange-100" />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={2}
        strokeDasharray={circumference} strokeDashoffset={monthOffset} strokeLinecap="round"
        className="text-orange-300/50 transition-all duration-700"
      />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={spendOffset} strokeLinecap="round"
        className={`${spendColor} transition-all duration-700`}
      />
    </svg>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

type View = "daily" | "monthly";

export function SpendingCard({ className, spent, limit }: { className?: string; spent: number; limit: number }) {
  const [view, setView] = useState<View>("daily");

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth);
  const monthElapsedPct = (dayOfMonth / daysInMonth) * 100;

  const safeLimit = limit || 1;
  const usedPct = Math.min(100, (spent / safeLimit) * 100);
  const remaining = Math.max(0, limit - spent);
  const overspent = spent > limit;
  const dailyAllowance = remaining / daysLeft;

  const expectedSpend = limit * (dayOfMonth / daysInMonth);
  const spendDelta = expectedSpend - spent;
  const dailyRate = limit / daysInMonth;
  const daysDelta = dailyRate > 0 ? Math.round(Math.abs(spendDelta) / dailyRate) : 0;
  const isAhead = spendDelta > 0 && !overspent;
  const isBehind = spendDelta < -limit * 0.05;

  const pace = overspent
    ? { label: "over limit", color: "text-red-500", dot: "bg-red-400" }
    : daysDelta === 0
      ? { label: "on pace", color: "text-green-600", dot: "bg-green-400" }
      : isAhead
        ? { label: `${daysDelta}d ahead`, color: "text-green-600", dot: "bg-green-400" }
        : isBehind
          ? { label: `${daysDelta}d behind`, color: "text-amber-600", dot: "bg-amber-400" }
          : { label: "on pace", color: "text-green-600", dot: "bg-green-400" };

  // Loading skeleton
  if (!Number.isFinite(limit)) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-orange-200 bg-linear-to-br from-orange-50 to-white shadow-sm shadow-orange-900/5 ${className ?? ""}`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💸</span>
              <div className="h-3 w-16 animate-pulse rounded-full bg-orange-200" />
            </div>
            <div className="h-3 w-12 animate-pulse rounded-full bg-orange-100" />
          </div>
          <div className="mt-5 h-9 animate-pulse rounded-xl bg-orange-100/60" />
          <div className="mt-6 flex items-center gap-6">
            <div className="h-28 w-28 shrink-0 animate-pulse rounded-full bg-orange-100" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-24 animate-pulse rounded-full bg-orange-100" />
              <div className="h-9 w-32 animate-pulse rounded-lg bg-orange-100" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-orange-50" />
            </div>
          </div>
          <div className="mt-6 h-px bg-orange-100" />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded-lg bg-orange-50" />
            <div className="h-10 animate-pulse rounded-lg bg-orange-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-orange-200 bg-linear-to-br from-orange-50 to-white shadow-sm shadow-orange-900/5 ${className ?? ""}`}>
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💸</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">
              spending
            </span>
          </div>
          <Link
            href="/spending"
            className="cursor-pointer text-xs font-medium text-green-400 transition hover:text-green-600"
          >
            view all →
          </Link>
        </div>

        {/* Segmented toggle */}
        <div className="mt-5 flex rounded-xl bg-orange-100/60 p-1">
          {(["daily", "monthly"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-all duration-200 ${
                view === v
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-green-500 hover:text-green-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="mt-6 flex items-center gap-5">
          <div className="relative flex shrink-0 items-center justify-center">
            <CircularProgress spendPct={usedPct} monthPct={monthElapsedPct} />
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-base font-bold tabular-nums text-orange-500">
                {Math.round(usedPct)}%
              </span>
              <span className="text-[10px] text-orange-300">used</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {overspent ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400">over budget</p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums leading-none text-red-500">
                  {fmt(spent - limit)}
                </p>
                <p className="mt-1.5 text-sm text-green-400">over your {fmt(limit)} limit</p>
              </>
            ) : view === "daily" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
                  today&apos;s allowance
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums leading-none text-green-950">
                  {fmt(dailyAllowance)}
                  <span className="ml-1 text-lg font-normal text-green-400">/day</span>
                </p>
                <p className="mt-1.5 text-sm text-green-400">
                  {fmt(remaining)} left &middot; {daysLeft}d to go
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
                  spent this month
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums leading-none text-green-950">
                  {fmt(spent)}
                </p>
                <p className="mt-1.5 text-sm text-green-400">of {fmt(limit)} limit</p>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-6 h-px bg-orange-100" />

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-x-6">
          {view === "daily" ? (
            <>
              <div>
                <p className="text-xs text-green-400">spent</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-800">
                  {fmt(spent)}
                  <span className="ml-1 font-normal text-green-300">/ {fmt(limit)}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-green-400">pace</p>
                <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${pace.color}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${pace.dot}`} />
                  {pace.label}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-green-400">{overspent ? "overspent" : "remaining"}</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${overspent ? "text-red-500" : "text-green-800"}`}>
                  {overspent ? fmt(spent - limit) : fmt(remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-400">budget used</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                  usedPct > 90 ? "text-red-500" : usedPct > 70 ? "text-amber-500" : "text-green-800"
                }`}>
                  {Math.round(usedPct)}%
                </p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
