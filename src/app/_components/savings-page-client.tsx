"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";

import { api } from "~/trpc/react";
import { useToast } from "./toast-provider";
import { EditableEntryRow } from "./editable-entry-row";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}


// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: number; name: string; emoji: string | null; type: string | null };
type Goal = { id: number; categoryId: number; name: string; targetAmount: string };

// ─── Per-category card ────────────────────────────────────────────────────────

function SavingCategoryCard({
  category, goal, monthlyAllocation, month, year, onGoalChange,
}: {
  category: Category; goal: Goal | undefined; monthlyAllocation: number; month: number; year: number; onGoalChange: () => void;
}) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">("today");
  const [pickDate, setPickDate] = useState(todayStr);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState(goal?.name ?? category.name);
  const [goalTarget, setGoalTarget] = useState(goal ? String(Number(goal.targetAmount)) : "");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const entryDate = dateMode === "today" ? todayStr : dateMode === "yesterday" ? yesterdayStr : pickDate;

  const utils = api.useUtils();
  const { showToast } = useToast();
  const entriesQuery = api.entry.listAllForCategory.useQuery({ categoryId: category.id });
  const createEntry = api.entry.create.useMutation({
    onSuccess: (_, vars) => {
      void utils.entry.listAllForCategory.invalidate({ categoryId: category.id });
      void utils.entry.listForCategories.invalidate();
      setAmount(""); setDescription(""); setDateMode("today"); setShowAddForm(false);

      const amt = vars.amount;
      const newTotal = totalSaved + amt;

      if (goalTargetNum !== null) {
        const oldPct = goalTargetNum > 0 ? (totalSaved / goalTargetNum) * 100 : 0;
        const newPct = goalTargetNum > 0 ? (newTotal / goalTargetNum) * 100 : 0;
        if (newPct >= 100 && oldPct < 100) {
          showToast(`🏆 Goal smashed! ${category.name} is complete.`, "celebration", 4500);
        } else if (newPct >= 75 && oldPct < 75) {
          showToast(`🎯 75% to your ${goal?.name ?? category.name} goal. Almost there!`, "celebration");
        } else if (newPct >= 50 && oldPct < 50) {
          showToast(`📍 Halfway to ${goal?.name ?? category.name}. Keep stacking!`, "success");
        } else if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} into ${category.name}. Big energy.`, "celebration");
        } else if (amt >= 100) {
          showToast(`💰 ${fmt(amt)} added to ${category.name}. Solid work.`, "success");
        }
      } else {
        if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} saved to ${category.name}. Future you is hyped.`, "celebration");
        } else if (amt >= 100) {
          showToast(`💰 ${fmt(amt)} added to ${category.name}. Nice work!`, "success");
        }
      }
    },
  });
  const deleteEntry = api.entry.delete.useMutation({
    onSuccess: () => {
      void utils.entry.listAllForCategory.invalidate({ categoryId: category.id });
      void utils.entry.listForCategories.invalidate();
    },
  });
  const upsertGoal = api.goal.upsert.useMutation({
    onSuccess: (_, vars) => {
      onGoalChange();
      void utils.goal.list.invalidate();
      setShowGoalForm(false);
      const isNew = !goal;
      showToast(
        isNew
          ? `🎯 Goal set — ${fmt(Number(vars.targetAmount))} for ${category.name}. Let's build it.`
          : "Goal updated.",
        isNew ? "celebration" : "success",
      );
    },
  });

  const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const totalSaved = useMemo(() => allEntries.reduce((sum, e) => sum + Number(e.amount), 0), [allEntries]);
  const thisMonthTotal = useMemo(
    () => allEntries.filter((e) => e.month === month && e.year === year).reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries, month, year],
  );

  const goalTargetNum = goal ? Number(goal.targetAmount) : null;
  const goalPct = goalTargetNum !== null ? Math.min(100, (totalSaved / goalTargetNum) * 100) : null;
  const remainingToGoal = goalTargetNum !== null ? Math.max(0, goalTargetNum - totalSaved) : null;
  const goalReached = goalTargetNum !== null && totalSaved >= goalTargetNum;
  const monthsToGoal = monthlyAllocation > 0 && remainingToGoal !== null && remainingToGoal > 0 ? Math.ceil(remainingToGoal / monthlyAllocation) : null;
  const monthlyPct = monthlyAllocation ? Math.min(100, (thisMonthTotal / monthlyAllocation) * 100) : 0;

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

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({ categoryId: category.id, amount: value, date: entryDate, description: description.trim() || undefined });
  }

  function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(goalTarget);
    if (!Number.isFinite(value) || value <= 0) return;
    upsertGoal.mutate({ categoryId: category.id, name: goalName.trim() || category.name, targetAmount: value });
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">

      {/* Card header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            {category.emoji && <span className="mr-2">{category.emoji}</span>}
            {category.name}
          </h2>
          {goalPct !== null && !goalReached && (
            <p className="mt-0.5 text-sm text-green-500">{Math.round(goalPct)}% to goal</p>
          )}
          {goalReached && <p className="mt-0.5 text-sm text-green-500">goal reached 🎉</p>}
        </div>
        <button
          type="button"
          onClick={() => { setGoalName(goal?.name ?? category.name); setGoalTarget(goal ? String(Number(goal.targetAmount)) : ""); setShowGoalForm((v) => !v); }}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-600 transition hover:border-green-300 hover:text-green-800"
        >
          <Pencil size={12} />
          {goal ? "edit goal" : "set goal"}
        </button>
      </div>

      {/* Goal form */}
      {showGoalForm && (
        <form onSubmit={handleGoalSubmit} className="mb-5 space-y-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
              {goal ? "edit goal" : "set a goal"}
            </p>
            <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer text-green-400 transition hover:text-green-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name"
              className="min-w-0 flex-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-base text-green-950 outline-none placeholder:text-green-300"
            />
            <div className="flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <span className="mr-1 text-base text-green-400">$</span>
              <input
                value={goalTarget} onChange={(e) => setGoalTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="10,000" inputMode="decimal"
                className="w-24 bg-transparent font-mono text-base tabular-nums text-green-950 outline-none placeholder:text-green-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-green-400 transition hover:text-green-600">
              cancel
            </button>
            <button
              type="submit" disabled={upsertGoal.isPending || !goalTarget}
              className="cursor-pointer rounded-full bg-green-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              {upsertGoal.isPending ? "saving…" : "save goal"}
            </button>
          </div>
        </form>
      )}

      {/* Total saved + goal progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-green-950">
              {entriesQuery.isLoading
                ? <span className="inline-block h-9 w-32 animate-pulse rounded-lg bg-green-100" />
                : fmt(totalSaved)}
            </p>
            <p className="mt-0.5 text-sm text-green-500">
              {goalTargetNum !== null ? `of ${fmt(goalTargetNum)} · ${goal!.name}` : "total saved · no goal set"}
            </p>
          </div>
          {monthsToGoal !== null && (
            <p className="mb-0.5 text-sm text-green-400">~{monthsToGoal} mo to go</p>
          )}
        </div>
        {goalTargetNum !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-green-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${goalReached ? "bg-green-400" : "bg-green-500"}`}
              style={{ width: `${goalPct ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* This month stats */}
      <div className="mb-5 rounded-xl bg-green-50 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm text-green-600">this month</p>
          <p className="font-mono text-sm tabular-nums text-green-700">
            {fmt(thisMonthTotal)}
            {monthlyAllocation > 0 && <span className="text-green-400"> of {fmt(monthlyAllocation)}</span>}
          </p>
        </div>
        {monthlyAllocation > 0 ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-green-200">
            <div className="h-full rounded-full bg-green-400 transition-all duration-500" style={{ width: `${monthlyPct}%` }} />
          </div>
        ) : (
          <p className="text-sm text-green-400">no monthly allocation — set one in the budget split</p>
        )}
      </div>

      {/* Add contribution */}
      {!showAddForm ? (
        <button
          type="button" onClick={() => setShowAddForm(true)}
          className="mb-5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-200 py-2.5 text-sm text-green-400 transition hover:border-green-300 hover:text-green-600"
        >
          <Plus size={13} /> add contribution
        </button>
      ) : (
        <div className="mb-5 space-y-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">add contribution</p>
            <button type="button" onClick={() => { setShowAddForm(false); setAmount(""); setDescription(""); setDateMode("today"); }} className="cursor-pointer text-green-400 transition hover:text-green-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["today", "yesterday"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDateMode(d)}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === d ? "bg-green-500 font-medium text-white" : "border border-green-200 text-green-600 hover:text-green-800"}`}
              >{d}</button>
            ))}
            <button type="button" onClick={() => setDateMode("pick")}
              className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === "pick" ? "bg-green-500 font-medium text-white" : "border border-green-200 text-green-600 hover:text-green-800"}`}
            >{dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}</button>
            {dateMode === "pick" && (
              <input type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)}
                className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700 outline-none"
              />
            )}
          </div>
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <div className="flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
              <span className="mr-1 text-base text-green-400">$</span>
              <input
                value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-20 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                placeholder="0.00" inputMode="decimal" autoFocus
              />
            </div>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-base text-green-800 outline-none placeholder:text-green-300"
              placeholder="note (optional)"
            />
            <button
              type="submit" disabled={createEntry.isPending || !amount}
              className="cursor-pointer shrink-0 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              {createEntry.isPending ? "saving…" : "save"}
            </button>
          </form>
        </div>
      )}

      {/* Loading */}
      {entriesQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="h-4 w-32 animate-pulse rounded-md bg-green-100" />
              <div className="h-4 w-16 animate-pulse rounded-md bg-green-100" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!entriesQuery.isLoading && allEntries.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-green-400">no contributions yet — start saving!</p>
        </div>
      )}

      {/* History */}
      {!entriesQuery.isLoading && allEntries.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-400">history</p>
          <div className="space-y-4">
            {visibleGroups.map(([monthKey, txs]) => {
              const [yr, mo] = monthKey.split("-").map(Number);
              const label = format(new Date(yr!, mo! - 1, 1), "MMMM yyyy");
              const monthTotal = (txs ?? []).reduce((s, e) => s + Number(e.amount), 0);
              return (
                <div key={monthKey}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-green-600">{label}</p>
                    <p className="font-mono text-sm tabular-nums text-green-400">{fmt(monthTotal)}</p>
                  </div>
                  <ul className="divide-y divide-green-50">
                    {(txs ?? []).map((tx) => (
                      <EditableEntryRow
                        key={tx.id}
                        id={tx.id}
                        amount={Number(tx.amount)}
                        description={tx.description ?? null}
                        date={tx.date}
                        accent="green"
                        amountPrefix="+"
                        onDelete={() => deleteEntry.mutate({ id: tx.id })}
                        onSaveSuccess={() => {
                          void utils.entry.listAllForCategory.invalidate({ categoryId: category.id });
                          void utils.entry.listForCategories.invalidate();
                        }}
                        isDeleting={deleteEntry.isPending}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button" onClick={() => setShowAllHistory((v) => !v)}
              className="cursor-pointer mt-3 text-sm text-green-400 transition hover:text-green-600"
            >
              {showAllHistory ? "show less" : `show ${hiddenCount} more ${hiddenCount === 1 ? "month" : "months"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page client ──────────────────────────────────────────────────────────────

export function SavingsPageClient() {
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

  const allocationByCat = useMemo(() => {
    if (!budgetQuery.data) return {} as Record<number, number>;
    const income = Number(budgetQuery.data.income ?? 0);
    const result: Record<number, number> = {};
    budgetQuery.data.allocations.forEach((a) => { result[a.categoryId] = (income * a.allocationPct) / 100; });
    return result;
  }, [budgetQuery.data]);

  const goalsData = goalsQuery.data;
  const goalsByCat = useMemo((): Record<number, Goal | undefined> => {
    const result: Record<number, Goal | undefined> = {};
    (goalsData ?? []).forEach((g) => { result[g.categoryId] = g; });
    return result;
  }, [goalsData]);

  const isLoading = categoriesQuery.isLoading || budgetQuery.isLoading || goalsQuery.isLoading;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-600 transition hover:border-green-300 hover:text-green-800"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">savings</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-green-50" />)}
        </div>
      )}

      {!isLoading && savingCategories.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-base text-green-600">no savings categories set up.</p>
          <p className="mt-1 text-sm text-green-400">add a savings category during onboarding or in your settings.</p>
          <Link href="/home" className="mt-4 inline-block text-sm text-green-500 transition hover:text-green-700">← back to dashboard</Link>
        </div>
      )}

      {!isLoading && savingCategories.length > 0 && (
        <div className="space-y-4">
          {savingCategories.map((cat) => (
            <SavingCategoryCard
              key={cat.id} category={cat} goal={goalsByCat[cat.id]}
              monthlyAllocation={allocationByCat[cat.id] ?? 0} month={month} year={year}
              onGoalChange={() => void goalsQuery.refetch()}
            />
          ))}
        </div>
      )}
    </main>
  );
}
