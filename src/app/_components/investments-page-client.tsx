"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
  emoji: string | null;
  type: string | null;
};

type Goal = {
  id: number;
  categoryId: number;
  name: string;
  targetAmount: string;
};

// ─── Per-category card ────────────────────────────────────────────────────────

function InvestmentCategoryCard({
  category,
  goal,
  monthlyAllocation,
  month,
  year,
  onGoalChange,
}: {
  category: Category;
  goal: Goal | undefined;
  monthlyAllocation: number;
  month: number;
  year: number;
  onGoalChange: () => void;
}) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  // ── Entry form state ───────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">(
    "today",
  );
  const [pickDate, setPickDate] = useState(todayStr);

  // ── Goal form state ────────────────────────────────────────────────────────
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState(goal?.name ?? category.name);
  const [goalTarget, setGoalTarget] = useState(
    goal ? String(Number(goal.targetAmount)) : "",
  );

  // ── History ────────────────────────────────────────────────────────────────
  const [showAllHistory, setShowAllHistory] = useState(false);

  const entryDate =
    dateMode === "today"
      ? todayStr
      : dateMode === "yesterday"
        ? yesterdayStr
        : pickDate;

  // ── Queries & mutations ────────────────────────────────────────────────────
  const entriesQuery = api.entry.listAllForCategory.useQuery({
    categoryId: category.id,
  });

  const createEntry = api.entry.create.useMutation({
    onSuccess: () => {
      void entriesQuery.refetch();
      setAmount("");
      setDescription("");
      setDateMode("today");
      setShowAddForm(false);
    },
  });

  const deleteEntry = api.entry.delete.useMutation({
    onSuccess: () => void entriesQuery.refetch(),
  });

  const upsertGoal = api.goal.upsert.useMutation({
    onSuccess: () => {
      onGoalChange();
      setShowGoalForm(false);
    },
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const entriesData = entriesQuery.data;
  const allEntries = useMemo(() => entriesData ?? [], [entriesData]);

  const totalContributed = useMemo(
    () => allEntries.reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries],
  );

  const thisMonthTotal = useMemo(
    () =>
      allEntries
        .filter((e) => e.month === month && e.year === year)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries, month, year],
  );

  // Average monthly contribution across months that have entries
  const avgMonthly = useMemo(() => {
    const uniqueMonths = new Set(
      allEntries.map((e) => `${e.year}-${e.month}`),
    ).size;
    return uniqueMonths > 0 ? totalContributed / uniqueMonths : 0;
  }, [allEntries, totalContributed]);

  const goalTargetNum = goal ? Number(goal.targetAmount) : null;
  const goalPct =
    goalTargetNum !== null
      ? Math.min(100, (totalContributed / goalTargetNum) * 100)
      : null;
  const remainingToGoal =
    goalTargetNum !== null
      ? Math.max(0, goalTargetNum - totalContributed)
      : null;
  const goalReached =
    goalTargetNum !== null && totalContributed >= goalTargetNum;

  const monthsToGoal =
    monthlyAllocation > 0 &&
    remainingToGoal !== null &&
    remainingToGoal > 0
      ? Math.ceil(remainingToGoal / monthlyAllocation)
      : null;

  const monthlyPct = monthlyAllocation
    ? Math.min(100, (thisMonthTotal / monthlyAllocation) * 100)
    : 0;

  // Group history by month-year key
  const grouped = useMemo(() => {
    const map = new Map<string, typeof allEntries>();
    allEntries.forEach((e) => {
      const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [allEntries]);

  const visibleGroups = showAllHistory ? grouped : grouped.slice(0, 3);
  const hiddenCount = grouped.length - 3;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({
      categoryId: category.id,
      amount: value,
      date: entryDate,
      description: description.trim() || undefined,
    });
  }

  function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(goalTarget);
    if (!Number.isFinite(value) || value <= 0) return;
    upsertGoal.mutate({
      categoryId: category.id,
      name: goalName.trim() || category.name,
      targetAmount: value,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
      {/* Header row */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">
            {category.emoji && (
              <span className="mr-2">{category.emoji}</span>
            )}
            {category.name}
          </h2>
          {goalPct !== null && !goalReached && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {Math.round(goalPct)}% to goal
            </p>
          )}
          {goalReached && (
            <p className="mt-0.5 text-xs text-blue-400">goal reached 🎉</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setGoalName(goal?.name ?? category.name);
            setGoalTarget(goal ? String(Number(goal.targetAmount)) : "");
            setShowGoalForm((v) => !v);
          }}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/[0.16] hover:text-neutral-100"
        >
          <Pencil size={11} />
          {goal ? "edit goal" : "set goal"}
        </button>
      </div>

      {/* Goal form */}
      {showGoalForm && (
        <form
          onSubmit={handleGoalSubmit}
          className="mb-5 space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              {goal ? "edit goal" : "set a goal"}
            </p>
            <button
              type="button"
              onClick={() => setShowGoalForm(false)}
              className="text-neutral-600 transition hover:text-neutral-300"
            >
              <X size={13} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Retirement fund"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
            />
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2">
              <span className="mr-1 text-sm text-neutral-600">$</span>
              <input
                value={goalTarget}
                onChange={(e) =>
                  setGoalTarget(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="500,000"
                inputMode="decimal"
                className="w-24 bg-transparent font-mono text-sm tabular-nums outline-none placeholder:text-neutral-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowGoalForm(false)}
              className="rounded-full px-3 py-1.5 text-xs text-neutral-500 transition hover:text-neutral-200"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={upsertGoal.isPending || !goalTarget}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {upsertGoal.isPending ? "saving…" : "save goal"}
            </button>
          </div>
        </form>
      )}

      {/* Total contributed + goal bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
              {entriesQuery.isLoading ? (
                <span className="inline-block h-8 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
              ) : (
                fmt(totalContributed)
              )}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {goalTargetNum !== null
                ? `of ${fmt(goalTargetNum)} · ${goal!.name}`
                : "total contributed · no goal set"}
            </p>
          </div>

          {monthsToGoal !== null && (
            <p className="mb-0.5 text-xs text-neutral-600">
              ~{monthsToGoal} mo to goal
            </p>
          )}
        </div>

        {goalTargetNum !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalReached ? "bg-blue-300" : "bg-blue-400"
              }`}
              style={{ width: `${goalPct ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Stat strip: this month + avg monthly */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
          <p className="text-xs text-neutral-600">this month</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
            {fmt(thisMonthTotal)}
          </p>
          {monthlyAllocation > 0 && (
            <>
              <p className="mt-0.5 text-xs text-neutral-600">
                of {fmt(monthlyAllocation)} allocated
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-blue-400 opacity-50 transition-all duration-500"
                  style={{ width: `${monthlyPct}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
          <p className="text-xs text-neutral-600">avg / month</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
            {avgMonthly > 0 ? fmt(avgMonthly) : "—"}
          </p>
          {avgMonthly > 0 && monthlyAllocation > 0 && (
            <p
              className={`mt-0.5 text-xs ${
                avgMonthly >= monthlyAllocation
                  ? "text-blue-400"
                  : "text-neutral-600"
              }`}
            >
              {avgMonthly >= monthlyAllocation
                ? "on track"
                : `${fmt(monthlyAllocation - avgMonthly)} below target`}
            </p>
          )}
        </div>
      </div>

      {/* Add contribution */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mb-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-xs text-neutral-600 transition hover:border-white/[0.14] hover:text-neutral-300"
        >
          <Plus size={12} />
          add contribution
        </button>
      ) : (
        <form
          onSubmit={handleAddSubmit}
          className="mb-5 space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              add contribution
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-neutral-600 transition hover:text-neutral-300"
            >
              <X size={13} />
            </button>
          </div>

          {/* Date chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["today", "yesterday"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateMode(d)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  dateMode === d
                    ? "bg-white font-medium text-black"
                    : "border border-white/[0.08] text-neutral-500 hover:text-neutral-200"
                }`}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDateMode("pick")}
              className={`rounded-full px-3 py-1 text-xs transition ${
                dateMode === "pick"
                  ? "bg-white font-medium text-black"
                  : "border border-white/[0.08] text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {dateMode === "pick"
                ? format(parseISO(pickDate), "d MMM")
                : "pick date"}
            </button>
            {dateMode === "pick" && (
              <input
                type="date"
                value={pickDate}
                max={todayStr}
                onChange={(e) => setPickDate(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-neutral-300 outline-none"
              />
            )}
          </div>

          {/* Amount + note + submit */}
          <div className="flex gap-2">
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2">
              <span className="mr-1 text-sm text-neutral-600">$</span>
              <input
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="w-20 bg-transparent font-mono text-sm font-semibold tabular-nums outline-none placeholder:text-neutral-700"
                placeholder="0.00"
                inputMode="decimal"
                autoFocus
              />
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
              placeholder="note (optional)"
            />
            <button
              type="submit"
              disabled={createEntry.isPending || !amount}
              className="shrink-0 rounded-full bg-blue-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {createEntry.isPending ? "saving…" : "save"}
            </button>
          </div>
        </form>
      )}

      {/* Contribution history */}
      {entriesQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="h-3 w-32 animate-pulse rounded-md bg-white/[0.05]" />
              <div className="h-3 w-16 animate-pulse rounded-md bg-white/[0.05]" />
            </div>
          ))}
        </div>
      )}

      {!entriesQuery.isLoading && allEntries.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-xs text-neutral-700">
            no contributions yet — start investing!
          </p>
        </div>
      )}

      {!entriesQuery.isLoading && allEntries.length > 0 && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-600">
            history
          </p>

          <div className="space-y-4">
            {visibleGroups.map(([monthKey, txs]) => {
              const [yr, mo] = monthKey.split("-").map(Number);
              const label = format(new Date(yr!, mo! - 1, 1), "MMMM yyyy");
              const monthTotal = (txs ?? []).reduce(
                (s, e) => s + Number(e.amount),
                0,
              );

              return (
                <div key={monthKey}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium text-neutral-600">
                      {label}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-neutral-600">
                      {fmt(monthTotal)}
                    </p>
                  </div>

                  <ul className="divide-y divide-white/[0.04]">
                    {(txs ?? []).map((tx) => (
                      <li
                        key={tx.id}
                        className="group flex items-center justify-between py-2"
                      >
                        <p className="text-sm text-neutral-200">
                          {tx.description ?? (
                            <span className="text-neutral-600">
                              contribution
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-sm tabular-nums text-blue-400">
                            +{fmtFull(Number(tx.amount))}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              deleteEntry.mutate({ id: tx.id })
                            }
                            disabled={deleteEntry.isPending}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Delete contribution"
                          >
                            <Trash2
                              size={13}
                              className="text-neutral-600 transition hover:text-red-400"
                            />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllHistory((v) => !v)}
              className="mt-3 text-xs text-neutral-600 transition hover:text-neutral-400"
            >
              {showAllHistory
                ? "show less"
                : `show ${hiddenCount} more ${hiddenCount === 1 ? "month" : "months"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page client ──────────────────────────────────────────────────────────────

export function InvestmentsPageClient() {
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

  const allocationByCat = useMemo(() => {
    if (!budgetQuery.data) return {} as Record<number, number>;
    const income = Number(budgetQuery.data.income ?? 0);
    const result: Record<number, number> = {};
    budgetQuery.data.allocations.forEach((a) => {
      result[a.categoryId] = (income * a.allocationPct) / 100;
    });
    return result;
  }, [budgetQuery.data]);

  const goalsData = goalsQuery.data;
  const goalsByCat = useMemo((): Record<number, Goal | undefined> => {
    const result: Record<number, Goal | undefined> = {};
    (goalsData ?? []).forEach((g) => {
      result[g.categoryId] = g;
    });
    return result;
  }, [goalsData]);

  const isLoading =
    categoriesQuery.isLoading ||
    budgetQuery.isLoading ||
    goalsQuery.isLoading;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Page header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-neutral-400 transition hover:border-white/20 hover:text-neutral-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              investments
            </h1>
            <p className="text-xs text-neutral-600">
              {format(today, "MMMM yyyy")}
            </p>
          </div>
        </div>
      </header>

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && investmentCategories.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-neutral-500">no investment categories set up.</p>
          <p className="mt-1 text-xs text-neutral-700">
            add an investment category during onboarding or in your settings.
          </p>
          <Link
            href="/home"
            className="mt-4 inline-block text-xs text-neutral-600 transition hover:text-neutral-400"
          >
            ← back to dashboard
          </Link>
        </div>
      )}

      {/* Category cards */}
      {!isLoading && investmentCategories.length > 0 && (
        <div className="space-y-4">
          {investmentCategories.map((cat) => (
            <InvestmentCategoryCard
              key={cat.id}
              category={cat}
              goal={goalsByCat[cat.id]}
              monthlyAllocation={allocationByCat[cat.id] ?? 0}
              month={month}
              year={year}
              onGoalChange={() => void goalsQuery.refetch()}
            />
          ))}
        </div>
      )}
    </main>
  );
}
