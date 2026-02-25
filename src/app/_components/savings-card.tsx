"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PiggyBank } from "lucide-react";

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

  // Total saved across ALL time for all saving categories
  const totalSaved = useMemo(
    () =>
      (allEntriesQuery.data ?? []).reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      ),
    [allEntriesQuery.data],
  );

  // This month's contributions
  const thisMonthSaved = useMemo(
    () =>
      (allEntriesQuery.data ?? [])
        .filter((e) => e.month === month && e.year === year)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntriesQuery.data, month, year],
  );

  // Monthly allocation for all saving categories
  const monthlyAllocation = useMemo(() => {
    if (!budgetQuery.data) return 0;
    const income = Number(budgetQuery.data.income ?? 0);
    return savingCategories.reduce((sum, cat) => {
      const alloc = budgetQuery.data!.allocations.find(
        (a) => a.categoryId === cat.id,
      );
      return sum + (alloc ? (income * alloc.allocationPct) / 100 : 0);
    }, 0);
  }, [budgetQuery.data, savingCategories]);

  // Best goal progress (highest % among goals)
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

  const isLoading =
    categoriesQuery.isLoading ||
    budgetQuery.isLoading ||
    allEntriesQuery.isLoading;

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#111111] p-6 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank
            size={14}
            className="text-neutral-500"
            strokeWidth={1.5}
          />
          <span className="text-sm font-medium">savings</span>
        </div>
        <Link
          href="/savings"
          className="text-xs text-neutral-600 transition hover:text-neutral-300"
        >
          view
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="h-1.5 w-full animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      ) : savingCategories.length === 0 ? (
        <p className="text-xs text-neutral-700">no savings categories set up.</p>
      ) : (
        <>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {fmt(totalSaved)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {fmt(thisMonthSaved)} this month · of {fmt(monthlyAllocation)} allocated
          </p>

          {/* Monthly progress bar */}
          <div className="my-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              {Math.round(monthlyPct)}% of monthly target
            </span>
            {topGoalProgress && (
              <span className="text-xs text-neutral-500">
                {topGoalProgress.name}{" "}
                <span className="font-mono tabular-nums text-emerald-400">
                  {Math.round(topGoalProgress.pct)}%
                </span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
