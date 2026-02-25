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

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomCategoryPageClient({
  categoryId,
  categoryName,
  categoryEmoji,
}: {
  categoryId: number;
  categoryName: string;
  categoryEmoji: string | null;
}) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
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
  const [goalName, setGoalName] = useState(categoryName);
  const [goalTarget, setGoalTarget] = useState("");

  // ── History ────────────────────────────────────────────────────────────────
  const [showAllHistory, setShowAllHistory] = useState(false);

  const entryDate =
    dateMode === "today"
      ? todayStr
      : dateMode === "yesterday"
        ? yesterdayStr
        : pickDate;

  // ── Queries & mutations ────────────────────────────────────────────────────
  const entriesQuery = api.entry.listAllForCategory.useQuery({ categoryId });
  const goalQuery = api.goal.get.useQuery({ categoryId });
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });

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
      void goalQuery.refetch();
      setShowGoalForm(false);
    },
  });

  const deleteGoal = api.goal.delete.useMutation({
    onSuccess: () => void goalQuery.refetch(),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const entriesData = entriesQuery.data;
  const allEntries = useMemo(() => entriesData ?? [], [entriesData]);

  const totalLogged = useMemo(
    () => allEntries.reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries],
  );

  const thisMonthEntries = useMemo(
    () => allEntries.filter((e) => e.month === month && e.year === year),
    [allEntries, month, year],
  );

  const thisMonthTotal = useMemo(
    () => thisMonthEntries.reduce((sum, e) => sum + Number(e.amount), 0),
    [thisMonthEntries],
  );

  const avgMonthly = useMemo(() => {
    const uniqueMonths = new Set(
      allEntries.map((e) => `${e.year}-${e.month}`),
    ).size;
    return uniqueMonths > 0 ? totalLogged / uniqueMonths : 0;
  }, [allEntries, totalLogged]);

  const monthlyAllocation = useMemo(() => {
    if (!budgetQuery.data) return 0;
    const income = Number(budgetQuery.data.income ?? 0);
    const alloc = budgetQuery.data.allocations.find(
      (a) => a.categoryId === categoryId,
    );
    return alloc ? (income * alloc.allocationPct) / 100 : 0;
  }, [budgetQuery.data, categoryId]);

  const monthlyPct = monthlyAllocation
    ? Math.min(100, (thisMonthTotal / monthlyAllocation) * 100)
    : 0;

  const goal = goalQuery.data;
  const goalTargetNum = goal ? Number(goal.targetAmount) : null;
  const goalPct =
    goalTargetNum !== null
      ? Math.min(100, (totalLogged / goalTargetNum) * 100)
      : null;
  const remainingToGoal =
    goalTargetNum !== null ? Math.max(0, goalTargetNum - totalLogged) : null;
  const goalReached = goalTargetNum !== null && totalLogged >= goalTargetNum;
  const monthsToGoal =
    monthlyAllocation > 0 &&
    remainingToGoal !== null &&
    remainingToGoal > 0
      ? Math.ceil(remainingToGoal / monthlyAllocation)
      : null;

  // Group all entries by month
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
      categoryId,
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
      categoryId,
      name: goalName.trim() || categoryName,
      targetAmount: value,
    });
  }

  const isLoading = entriesQuery.isLoading || budgetQuery.isLoading;
  const displayName = `${categoryEmoji ? categoryEmoji + " " : ""}${categoryName}`;

  // ── Render ─────────────────────────────────────────────────────────────────
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
              {displayName}
            </h1>
            <p className="text-xs text-neutral-600">
              {format(today, "MMMM yyyy")}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {/* ── Monthly card ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
            this month
          </p>

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {isLoading ? (
                  <span className="inline-block h-9 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
                ) : (
                  fmt(thisMonthTotal)
                )}
              </p>
              {monthlyAllocation > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  of {fmt(monthlyAllocation)} allocated
                </p>
              )}
            </div>
            {monthlyAllocation > 0 && (
              <p
                className={`mb-1 font-mono text-sm tabular-nums ${
                  monthlyPct > 100
                    ? "text-red-400"
                    : monthlyPct >= 80
                      ? "text-amber-400"
                      : "text-neutral-400"
                }`}
              >
                {Math.round(monthlyPct)}%
              </p>
            )}
          </div>

          {/* Monthly progress bar */}
          {monthlyAllocation > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  monthlyPct > 100
                    ? "bg-red-400"
                    : monthlyPct >= 80
                      ? "bg-amber-400"
                      : "bg-violet-400"
                }`}
                style={{ width: `${Math.min(100, monthlyPct)}%` }}
              />
            </div>
          )}

          {/* Stat chips */}
          {!isLoading && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-neutral-600">total logged</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {fmt(totalLogged)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <p className="text-xs text-neutral-600">avg / month</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {avgMonthly > 0 ? fmt(avgMonthly) : "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Goal card ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              goal
            </p>
            <div className="flex items-center gap-2">
              {goal && (
                <button
                  type="button"
                  onClick={() => deleteGoal.mutate({ categoryId })}
                  disabled={deleteGoal.isPending}
                  className="text-xs text-neutral-700 transition hover:text-red-400"
                >
                  remove
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setGoalName(goal?.name ?? categoryName);
                  setGoalTarget(
                    goal ? String(Number(goal.targetAmount)) : "",
                  );
                  setShowGoalForm((v) => !v);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/[0.16] hover:text-neutral-100"
              >
                <Pencil size={11} />
                {goal ? "edit" : "set goal"}
              </button>
            </div>
          </div>

          {/* Goal form */}
          {showGoalForm && (
            <form
              onSubmit={handleGoalSubmit}
              className="mt-4 space-y-3 rounded-xl border border-white/[0.08] bg-black/20 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-600">
                  {goal ? "update goal" : "create a goal"}
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
                  placeholder="Goal name"
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
                />
                <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2">
                  <span className="mr-1 text-sm text-neutral-600">$</span>
                  <input
                    value={goalTarget}
                    onChange={(e) =>
                      setGoalTarget(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="5,000"
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
                  {upsertGoal.isPending ? "saving…" : "save"}
                </button>
              </div>
            </form>
          )}

          {/* Goal progress (if set) */}
          {!showGoalForm && goal && goalTargetNum !== null && (
            <div className="mt-4">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="font-mono text-2xl font-semibold tabular-nums">
                    {fmt(totalLogged)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    of {fmt(goalTargetNum)} · {goal.name}
                  </p>
                </div>
                <div className="mb-0.5 text-right">
                  {goalReached ? (
                    <p className="text-xs text-violet-400">goal reached 🎉</p>
                  ) : (
                    <>
                      <p className="font-mono text-sm tabular-nums text-neutral-300">
                        {Math.round(goalPct ?? 0)}%
                      </p>
                      {monthsToGoal !== null && (
                        <p className="text-xs text-neutral-600">
                          ~{monthsToGoal} mo to go
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    goalReached ? "bg-violet-300" : "bg-violet-400"
                  }`}
                  style={{ width: `${goalPct ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* No goal state */}
          {!showGoalForm && !goal && (
            <p className="mt-3 text-xs text-neutral-700">
              no goal set — click &quot;set goal&quot; to track progress toward a target.
            </p>
          )}
        </div>

        {/* ── Log entry form ────────────────────────────────────────────── */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-3 text-xs text-neutral-600 transition hover:border-white/[0.14] hover:text-neutral-300"
          >
            <Plus size={12} />
            log entry
          </button>
        ) : (
          <form
            onSubmit={handleAddSubmit}
            className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                log entry
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
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5">
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
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
                placeholder="note (optional)"
              />
              <button
                type="submit"
                disabled={createEntry.isPending || !amount}
                className="shrink-0 rounded-full bg-violet-500 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {createEntry.isPending ? "saving…" : "save"}
              </button>
            </div>
          </form>
        )}

        {/* ── History ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              history
            </p>
            {allEntries.length > 0 && (
              <p className="text-xs text-neutral-600">
                {allEntries.length}{" "}
                {allEntries.length === 1 ? "entry" : "entries"}
              </p>
            )}
          </div>

          {/* Loading */}
          {entriesQuery.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <div className="h-3 w-32 animate-pulse rounded-md bg-white/[0.05]" />
                  <div className="h-3 w-16 animate-pulse rounded-md bg-white/[0.05]" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!entriesQuery.isLoading && allEntries.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-neutral-600">no entries yet.</p>
              <p className="mt-1 text-xs text-neutral-700">
                log your first entry above to start tracking.
              </p>
            </div>
          )}

          {/* Grouped list */}
          {!entriesQuery.isLoading && allEntries.length > 0 && (
            <div className="space-y-5">
              {visibleGroups.map(([monthKey, entries]) => {
                const [yr, mo] = monthKey.split("-").map(Number);
                const label = format(
                  new Date(yr!, mo! - 1, 1),
                  "MMMM yyyy",
                );
                const monthTotal = (entries ?? []).reduce(
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
                      {(entries ?? []).map((entry) => (
                        <li
                          key={entry.id}
                          className="group flex items-center justify-between py-2.5"
                        >
                          <p className="text-sm text-neutral-200">
                            {entry.description ?? (
                              <span className="text-neutral-600">
                                entry
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3">
                            <p className="font-mono text-sm tabular-nums text-violet-400">
                              {fmtFull(Number(entry.amount))}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                deleteEntry.mutate({ id: entry.id })
                              }
                              disabled={deleteEntry.isPending}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Delete entry"
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

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="text-xs text-neutral-600 transition hover:text-neutral-400"
                >
                  {showAllHistory
                    ? "show less"
                    : `show ${hiddenCount} more ${hiddenCount === 1 ? "month" : "months"}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
