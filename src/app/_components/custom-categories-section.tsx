"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { api } from "~/trpc/react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CustomCategoriesSection() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const categoriesQuery = api.category.list.useQuery();
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const goalsQuery = api.goal.list.useQuery();

  const customCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === "custom"),
    [categoriesQuery.data],
  );

  const categoryIds = customCategories.map((c) => c.id);

  const allEntriesQuery = api.entry.listForCategories.useQuery(
    { categoryIds },
    { enabled: categoryIds.length > 0 },
  );

  const allEntries = useMemo(
    () => allEntriesQuery.data ?? [],
    [allEntriesQuery.data],
  );

  // Per-category stats for this month
  const statsByCat = useMemo(() => {
    if (!budgetQuery.data) return {} as Record<number, { monthTotal: number; allocation: number; totalLogged: number }>;
    const income = Number(budgetQuery.data.income ?? 0);
    const result: Record<number, { monthTotal: number; allocation: number; totalLogged: number }> = {};

    customCategories.forEach((cat) => {
      const catEntries = allEntries.filter((e) => e.categoryId === cat.id);
      const alloc = budgetQuery.data.allocations.find(
        (a) => a.categoryId === cat.id,
      );
      result[cat.id] = {
        monthTotal: catEntries
          .filter((e) => e.month === month && e.year === year)
          .reduce((s, e) => s + Number(e.amount), 0),
        allocation: alloc ? (income * alloc.allocationPct) / 100 : 0,
        totalLogged: catEntries.reduce((s, e) => s + Number(e.amount), 0),
      };
    });

    return result;
  }, [budgetQuery.data, allEntries, customCategories, month, year]);

  const goalsData = goalsQuery.data;
  const goalsByCat = useMemo(() => {
    const result: Record<number, { name: string; targetAmount: string } | undefined> = {};
    (goalsData ?? [])
      .filter((g) => categoryIds.includes(g.categoryId))
      .forEach((g) => {
        result[g.categoryId] = g;
      });
    return result;
  }, [goalsData, categoryIds]);

  if (customCategories.length === 0) return null;

  const isLoading =
    categoriesQuery.isLoading ||
    budgetQuery.isLoading ||
    allEntriesQuery.isLoading;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
          custom
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customCategories.map((cat) => {
          const stats = statsByCat[cat.id] ?? {
            monthTotal: 0,
            allocation: 0,
            totalLogged: 0,
          };
          const goal = goalsByCat[cat.id];
          const goalTargetNum = goal ? Number(goal.targetAmount) : null;
          const goalPct =
            goalTargetNum !== null && stats.totalLogged > 0
              ? Math.min(100, (stats.totalLogged / goalTargetNum) * 100)
              : null;
          const monthlyPct =
            stats.allocation > 0
              ? Math.min(100, (stats.monthTotal / stats.allocation) * 100)
              : 0;
          const barColor =
            monthlyPct > 100
              ? "bg-red-400"
              : monthlyPct >= 80
                ? "bg-amber-400"
                : "bg-violet-400";

          return (
            <Link
              key={cat.id}
              href={`/custom/${cat.id}`}
              className="group rounded-2xl border border-white/[0.06] bg-[#111111] p-5 transition hover:border-white/[0.10] hover:bg-[#161616]"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {cat.emoji && (
                    <span className="text-base">{cat.emoji}</span>
                  )}
                  <span className="text-sm font-medium text-neutral-200">
                    {cat.name}
                  </span>
                </div>
                <ArrowRight
                  size={13}
                  className="mt-0.5 text-neutral-700 transition group-hover:text-neutral-400"
                />
              </div>

              {/* Skeleton */}
              {isLoading && (
                <div className="space-y-2">
                  <div className="h-6 w-20 animate-pulse rounded-md bg-white/[0.05]" />
                  <div className="h-1 w-full animate-pulse rounded-full bg-white/[0.05]" />
                </div>
              )}

              {/* Stats */}
              {!isLoading && (
                <>
                  {/* Goal mode (if goal set): show total / target */}
                  {goal && goalTargetNum !== null ? (
                    <div className="mb-3">
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        {fmt(stats.totalLogged)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-600">
                        of {fmt(goalTargetNum)} · {goal.name}
                      </p>
                      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all duration-500"
                          style={{ width: `${goalPct ?? 0}%` }}
                        />
                      </div>
                      {goalPct !== null && (
                        <p className="mt-1.5 font-mono text-xs tabular-nums text-neutral-600">
                          {Math.round(goalPct)}% to goal
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Budget mode: show this month vs allocation */
                    <div className="mb-3">
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        {fmt(stats.monthTotal)}
                      </p>
                      {stats.allocation > 0 ? (
                        <p className="mt-0.5 text-xs text-neutral-600">
                          of {fmt(stats.allocation)} this month
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-neutral-700">
                          this month · no allocation set
                        </p>
                      )}
                      {stats.allocation > 0 && (
                        <>
                          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${monthlyPct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 font-mono text-xs tabular-nums text-neutral-600">
                            {Math.round(monthlyPct)}% used
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
