"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, History } from "lucide-react";

import { api } from "~/trpc/react";
import { EmptyState } from "./empty-state";
import { HistoryBarChart } from "./history-bar-chart";
import { HistoryDonutChart } from "./history-donut-chart";
import { HistoryTrendChart } from "./history-trend-chart";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDelta(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${fmt(abs)}`;
}

function monthLabel(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

function monthShort(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMM yyyy");
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  accentClass,
  borderClass,
  isLoading,
}: {
  label: string;
  value: number;
  delta?: number;
  accentClass: string;
  borderClass: string;
  isLoading: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm shadow-green-900/5 ${borderClass}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${accentClass}`}>{label}</p>
      {isLoading ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-green-100" />
      ) : (
        <>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-green-950">
            {fmt(value)}
          </p>
          {delta !== undefined && (
            <p className={`mt-1 text-xs tabular-nums ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmtDelta(delta)} vs last month
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoryPageClient() {
  // All budgets (sorted newest first) — drives navigator bounds
  const budgetsQuery = api.budget.listMonths.useQuery();
  const categoriesQuery = api.category.list.useQuery();

  // Determine the default selected month: most recently completed month
  const defaultIndex = useMemo(() => {
    if (!budgetsQuery.data?.length) return 0;
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    // Find first budget that isn't the current month
    const idx = budgetsQuery.data.findIndex(
      (b) => !(b.month === curMonth && b.year === curYear),
    );
    return idx === -1 ? 0 : idx;
  }, [budgetsQuery.data]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Once we know the default, lock it in
  const activeIndex = selectedIndex ?? defaultIndex;

  const budgets = budgetsQuery.data ?? [];
  const selectedBudget = budgets[activeIndex];

  // Summary data for selected month
  const summaryQuery = api.entry.monthlySummary.useQuery(
    selectedBudget
      ? { month: selectedBudget.month, year: selectedBudget.year }
      : { month: 1, year: 2000 },
    { enabled: !!selectedBudget },
  );

  // Previous month data for deltas
  const prevBudget = budgets[activeIndex + 1];
  const prevSummaryQuery = api.entry.monthlySummary.useQuery(
    prevBudget
      ? { month: prevBudget.month, year: prevBudget.year }
      : { month: 1, year: 2000 },
    { enabled: !!prevBudget },
  );

  const categories = categoriesQuery.data ?? [];

  // Build a lookup: categoryId → category
  const catById = useMemo(() => {
    const m = new Map<number, (typeof categories)[0]>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  // Compute totals from summary for selected month
  const { income, totalSpent, totalSaved, totalInvested } = useMemo(() => {
    if (!selectedBudget || !summaryQuery.data) {
      return { income: selectedBudget ? Number(selectedBudget.income) : 0, totalSpent: 0, totalSaved: 0, totalInvested: 0 };
    }
    const inc = Number(selectedBudget.income ?? 0);
    let spent = 0, saved = 0, invested = 0;
    summaryQuery.data.forEach(({ categoryId, total }) => {
      const cat = catById.get(categoryId);
      const amt = Number(total ?? 0);
      if (cat?.type === "spending") spent += amt;
      else if (cat?.type === "saving") saved += amt;
      else if (cat?.type === "investment") invested += amt;
    });
    return { income: inc, totalSpent: spent, totalSaved: saved, totalInvested: invested };
  }, [selectedBudget, summaryQuery.data, catById]);

  // Deltas vs previous month
  const { deltaSaved, deltaInvested } = useMemo(() => {
    if (!prevSummaryQuery.data) return { deltaSaved: undefined, deltaInvested: undefined };
    let pSaved = 0, pInvested = 0;
    prevSummaryQuery.data.forEach(({ categoryId, total }) => {
      const cat = catById.get(categoryId);
      const amt = Number(total ?? 0);
      if (cat?.type === "saving") pSaved += amt;
      else if (cat?.type === "investment") pInvested += amt;
    });
    return { deltaSaved: totalSaved - pSaved, deltaInvested: totalInvested - pInvested };
  }, [prevSummaryQuery.data, totalSaved, totalInvested, catById]);

  const isStatsLoading = budgetsQuery.isLoading || categoriesQuery.isLoading || summaryQuery.isLoading;
  const hasBudget = !!selectedBudget;

  // ── Navigator handlers ───────────────────────────────────────────────────

  function goNext() {
    setSelectedIndex((i) => Math.max(0, (i ?? activeIndex) - 1));
  }

  function goPrev() {
    setSelectedIndex((i) => Math.min(budgets.length - 1, (i ?? activeIndex) + 1));
  }

  function jumpTo(idx: number) {
    setSelectedIndex(idx);
  }

  const atNewest = activeIndex === 0;
  const atOldest = activeIndex === budgets.length - 1;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">

      {/* Page header */}
      <header className="mb-8 flex items-center gap-3">
        <Link
          href="/home"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-600 transition hover:border-green-300 hover:text-green-800"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="flex items-center gap-2">
          <History size={18} className="text-green-400" />
          <h1 className="text-2xl font-semibold tracking-tight text-green-950">history</h1>
        </div>
      </header>

      {/* No budgets at all */}
      {!budgetsQuery.isLoading && budgets.length === 0 && (
        <EmptyState
          mascotSize={64}
          animate="float"
          headline="no history yet"
          body="once you've logged entries for a month, they'll appear here."
          action={{ label: "go to dashboard", href: "/home" }}
        />
      )}

      {(budgetsQuery.isLoading || budgets.length > 0) && (
        <div className="space-y-6">

          {/* Month navigator */}
          <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-white px-6 py-4 shadow-sm shadow-green-900/5">
            <button
              type="button"
              onClick={goPrev}
              disabled={atOldest || budgetsQuery.isLoading}
              aria-label="Previous month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-green-200 text-green-500 transition hover:border-green-300 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-4">
              {budgetsQuery.isLoading ? (
                <div className="h-7 w-36 animate-pulse rounded-lg bg-green-100" />
              ) : (
                <h2 className="text-xl font-semibold tracking-tight text-green-950">
                  {selectedBudget ? monthLabel(selectedBudget.month, selectedBudget.year) : "—"}
                </h2>
              )}

              {/* Jump select */}
              {!budgetsQuery.isLoading && budgets.length > 1 && (
                <select
                  value={activeIndex}
                  onChange={(e) => jumpTo(Number(e.target.value))}
                  className="cursor-pointer rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700 outline-none transition hover:border-green-300"
                >
                  {budgets.map((b, i) => (
                    <option key={`${b.year}-${b.month}`} value={i}>
                      {monthShort(b.month, b.year)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={atNewest || budgetsQuery.isLoading}
              aria-label="Next month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-green-200 text-green-500 transition hover:border-green-300 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* No budget for this month */}
          {!budgetsQuery.isLoading && !hasBudget && (
            <EmptyState
              mascotSize={56}
              animate="float"
              headline="no budget for this month"
              body="budgets are created automatically when you start logging entries."
            />
          )}

          {hasBudget && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                  label="income"
                  value={income}
                  accentClass="text-green-400"
                  borderClass="border-green-100"
                  isLoading={isStatsLoading}
                />
                <StatCard
                  label="💸 spent"
                  value={totalSpent}
                  accentClass="text-orange-400"
                  borderClass="border-orange-100"
                  isLoading={isStatsLoading}
                />
                <StatCard
                  label="🏦 saved"
                  value={totalSaved}
                  delta={deltaSaved}
                  accentClass="text-green-500"
                  borderClass="border-green-100"
                  isLoading={isStatsLoading}
                />
                <StatCard
                  label="📈 invested"
                  value={totalInvested}
                  delta={deltaInvested}
                  accentClass="text-blue-400"
                  borderClass="border-blue-100"
                  isLoading={isStatsLoading}
                />
              </div>

              {/* Budget vs Actual bar chart */}
              <HistoryBarChart
                budget={selectedBudget}
                summaryData={summaryQuery.data ?? []}
                categories={categories}
                isLoading={isStatsLoading}
              />

              {/* Donut + Trend side by side */}
              <div className="grid gap-4 md:grid-cols-2">
                <HistoryDonutChart
                  summaryData={summaryQuery.data ?? []}
                  categories={categories}
                  isLoading={isStatsLoading}
                />
                <HistoryTrendChart
                  budgets={budgets}
                  categories={categories}
                  selectedMonth={selectedBudget.month}
                  selectedYear={selectedBudget.year}
                />
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
