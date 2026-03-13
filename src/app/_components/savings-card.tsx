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

export function SavingsCard({ className }: { className?: string }) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const categoriesQuery = api.category.list.useQuery();
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const goalsQuery = api.goal.list.useQuery();

  const savingCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === "saving"),
    [categoriesQuery.data],
  );

  const categoryIds = savingCategories.map((c) => c.id);

  const allEntriesQuery = api.entry.listForCategories.useQuery(
    { categoryIds },
    { enabled: categoryIds.length > 0 },
  );

  const totalSaved = useMemo(
    () =>
      (allEntriesQuery.data ?? []).reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      ),
    [allEntriesQuery.data],
  );

  const thisMonthSaved = useMemo(
    () =>
      (allEntriesQuery.data ?? [])
        .filter((e) => e.month === month && e.year === year)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntriesQuery.data, month, year],
  );

  const monthlyAllocation = useMemo(() => {
    if (!budgetQuery.data) return 0;
    const income = Number(budgetQuery.data.income ?? 0);
    return savingCategories.reduce((sum, cat) => {
      const alloc = budgetQuery.data.allocations.find(
        (a) => a.categoryId === cat.id,
      );
      return sum + (alloc ? (income * alloc.allocationPct) / 100 : 0);
    }, 0);
  }, [budgetQuery.data, savingCategories]);

  const topGoalProgress = useMemo(() => {
    if (!goalsQuery.data || goalsQuery.data.length === 0) return null;
    const progresses = goalsQuery.data
      .filter((g) => categoryIds.includes(g.categoryId))
      .map((g) => {
        const catEntries = (allEntriesQuery.data ?? []).filter(
          (e) => e.categoryId === g.categoryId,
        );
        const saved = catEntries.reduce(
          (s, e) => s + Number(e.amount),
          0,
        );
        return {
          name: g.name,
          pct: Math.min(100, (saved / Number(g.targetAmount)) * 100),
        };
      })
      .sort((a, b) => b.pct - a.pct);

    return progresses[0] ?? null;
  }, [goalsQuery.data, allEntriesQuery.data, categoryIds]);

  const monthlyPct = monthlyAllocation
    ? Math.min(100, (thisMonthSaved / monthlyAllocation) * 100)
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
    statusClass = "bg-green-50 text-green-500";
  } else if (monthlyPct === 0) {
    statusLabel = "not started yet";
    statusClass = "bg-green-50 text-green-500";
  } else if (monthlyPct >= monthElapsedPct + 5) {
    statusLabel = "ahead of pace";
    statusClass = "bg-green-100 text-green-700";
  } else if (monthlyPct <= monthElapsedPct - 5) {
    statusLabel = "behind";
    statusClass = "bg-amber-100 text-amber-700";
  } else {
    statusLabel = "on track";
    statusClass = "bg-green-100 text-green-700";
  }

  const isLoading =
    categoriesQuery.isLoading ||
    budgetQuery.isLoading ||
    allEntriesQuery.isLoading;

  return (
    <div
      className={`rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-green-500">
            <span className="mr-1 text-sm">💰</span>
            savings
          </span>
        </div>
        <Link
          href="/savings"
          className="text-xs font-medium text-green-400 transition hover:text-green-600"
        >
          view →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-green-100" />
          <div className="h-3 w-full animate-pulse rounded-full bg-green-100" />
        </div>
      ) : savingCategories.length === 0 ? (
        <p className="text-sm text-green-500">no savings categories set up.</p>
      ) : (
        <>
          <p className="font-mono text-4xl font-semibold tabular-nums text-green-950">
            {fmt(totalSaved)}
          </p>
          <p className="mt-1 text-sm text-green-600">
            {fmt(thisMonthSaved)} this month · of {fmt(monthlyAllocation)} allocated
          </p>

          {/* Monthly progress bar */}
          <div className="my-4 h-3 w-full overflow-hidden rounded-full bg-green-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-green-600">
                {Math.round(monthlyPct)}% of monthly target
              </span>
              {topGoalProgress && (
                <span className="text-xs text-green-400">
                  {topGoalProgress.name}{" "}
                  <span className="font-mono tabular-nums text-green-600">
                    {Math.round(topGoalProgress.pct)}%
                  </span>
                </span>
              )}
            </div>
            {statusLabel && (
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}
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
