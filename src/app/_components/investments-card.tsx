"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getDaysInMonth } from "date-fns";

import { api } from "~/trpc/react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvestmentsCard({ className }: { className?: string }) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const categoriesQuery = api.category.list.useQuery();
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const goalsQuery = api.goal.list.useQuery();

  const investmentCategories = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter((c) => c.type === "investment"),
    [categoriesQuery.data],
  );

  const categoryIds = investmentCategories.map((c) => c.id);

  const allEntriesQuery = api.entry.listForCategories.useQuery(
    { categoryIds },
    { enabled: categoryIds.length > 0 },
  );

  const allEntries = useMemo(
    () => allEntriesQuery.data ?? [],
    [allEntriesQuery.data],
  );

  // Total contributed across ALL time
  const totalContributed = useMemo(
    () => allEntries.reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries],
  );

  // This month's contributions
  const thisMonthTotal = useMemo(
    () =>
      allEntries
        .filter((e) => e.month === month && e.year === year)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries, month, year],
  );

  // Monthly allocation for all investment categories
  const monthlyAllocation = useMemo(() => {
    if (!budgetQuery.data) return 0;
    const income = Number(budgetQuery.data.income ?? 0);
    return investmentCategories.reduce((sum, cat) => {
      const alloc = budgetQuery.data.allocations.find(
        (a) => a.categoryId === cat.id,
      );
      return sum + (alloc ? (income * alloc.allocationPct) / 100 : 0);
    }, 0);
  }, [budgetQuery.data, investmentCategories]);

  // Top goal progress
  const topGoalProgress = useMemo(() => {
    if (!goalsQuery.data || goalsQuery.data.length === 0) return null;
    const progresses = goalsQuery.data
      .filter((g) => categoryIds.includes(g.categoryId))
      .map((g) => {
        const catEntries = allEntries.filter(
          (e) => e.categoryId === g.categoryId,
        );
        const contributed = catEntries.reduce(
          (s, e) => s + Number(e.amount),
          0,
        );
        return {
          name: g.name,
          pct: Math.min(100, (contributed / Number(g.targetAmount)) * 100),
        };
      })
      .sort((a, b) => b.pct - a.pct);

    return progresses[0] ?? null;
  }, [goalsQuery.data, allEntries, categoryIds]);

  const monthlyPct = monthlyAllocation
    ? Math.min(100, (thisMonthTotal / monthlyAllocation) * 100)
    : 0;

  const monthDate = new Date(year, month - 1, 1);
  const totalDaysInMonth = getDaysInMonth(monthDate);
  const monthEnd = new Date(year, month, 0);

  let daysElapsed = 0;
  if (today < monthDate) {
    daysElapsed = 0;
  } else if (today > monthEnd) {
    daysElapsed = totalDaysInMonth;
  } else {
    daysElapsed = today.getDate();
  }

  const monthElapsedPct =
    totalDaysInMonth > 0 ? (daysElapsed / totalDaysInMonth) * 100 : 0;

  let statusLabel: string | null = null;
  let statusClass = "";

  if (!monthlyAllocation) {
    statusLabel = "no allocation set";
    statusClass = "bg-white/[0.04] text-neutral-400";
  } else if (monthlyPct === 0) {
    statusLabel = "not started yet";
    statusClass = "bg-white/[0.04] text-neutral-400";
  } else if (monthlyPct >= monthElapsedPct + 5) {
    statusLabel = "ahead of pace";
    statusClass = "bg-emerald-400/10 text-emerald-300";
  } else if (monthlyPct <= monthElapsedPct - 5) {
    statusLabel = "behind";
    statusClass = "bg-amber-400/10 text-amber-300";
  } else {
    statusLabel = "on track";
    statusClass = "bg-emerald-400/10 text-emerald-300";
  }

  const isLoading =
    categoriesQuery.isLoading ||
    budgetQuery.isLoading ||
    allEntriesQuery.isLoading;

  return (
    <div
      className={`rounded-2xl border border-blue-400/20 bg-blue-400/[0.03] p-6 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span className="text-xs uppercase tracking-[0.16em] text-neutral-400">
            <span className="mr-1 text-sm">📈</span>
            investments
          </span>
        </div>
        <Link
          href="/investments"
          className="text-xs text-neutral-600 transition hover:text-neutral-300"
        >
          view
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      ) : investmentCategories.length === 0 ? (
        <p className="text-xs text-neutral-700">
          no investment categories set up.
        </p>
      ) : (
        <>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {fmt(totalContributed)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {fmt(thisMonthTotal)} this month · of {fmt(monthlyAllocation)}{" "}
            allocated
          </p>

          {/* Monthly progress bar */}
          <div className="my-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-500"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-neutral-600">
                {Math.round(monthlyPct)}% of monthly target
              </span>
              {topGoalProgress && (
                <span className="text-xs text-neutral-500">
                  {topGoalProgress.name}{" "}
                  <span className="font-mono tabular-nums text-blue-400">
                    {Math.round(topGoalProgress.pct)}%
                  </span>
                </span>
              )}
            </div>
            {statusLabel && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

