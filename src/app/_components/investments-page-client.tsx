"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Pencil, Plus, X } from "lucide-react";

import { api } from "~/trpc/react";
import { BackButton } from "./back-button";
import { useToast } from "./toast-provider";
import { EditableEntryRow } from "./editable-entry-row";
import { EmptyState } from "./empty-state";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}


type Category = { id: number; name: string; emoji: string | null; type: string | null };
type Goal = { id: number; categoryId: number; name: string; targetAmount: string };

// ─── Per-category card ────────────────────────────────────────────────────────

function InvestmentCategoryCard({
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
      const newTotal = totalContributed + amt;

      if (goalTargetNum !== null) {
        const oldPct = goalTargetNum > 0 ? (totalContributed / goalTargetNum) * 100 : 0;
        const newPct = goalTargetNum > 0 ? (newTotal / goalTargetNum) * 100 : 0;
        if (newPct >= 100 && oldPct < 100) {
          showToast(`🏆 Investment goal hit! ${category.name} is fully funded.`, "celebration", 4500);
        } else if (newPct >= 75 && oldPct < 75) {
          showToast(`📈 75% to ${goal?.name ?? category.name}. Compounding from here!`, "celebration");
        } else if (newPct >= 50 && oldPct < 50) {
          showToast(`📍 Halfway to ${goal?.name ?? category.name}. Momentum is everything.`, "success");
        } else if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} invested in ${category.name}. That's how it's done.`, "celebration");
        } else if (amt >= 100) {
          showToast(`📈 ${fmt(amt)} into ${category.name}. Nice move.`, "success");
        }
      } else {
        if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} invested in ${category.name}. Your portfolio thanks you.`, "celebration");
        } else if (amt >= 100) {
          showToast(`📈 ${fmt(amt)} into ${category.name}. Every bit compounds.`, "success");
        }
      }
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
          ? `🎯 Investment goal set — ${fmt(Number(vars.targetAmount))} for ${category.name}.`
          : "Goal updated.",
        isNew ? "celebration" : "success",
      );
    },
  });

  const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const totalContributed = useMemo(() => allEntries.reduce((sum, e) => sum + Number(e.amount), 0), [allEntries]);
  const thisMonthTotal = useMemo(
    () => allEntries.filter((e) => e.month === month && e.year === year).reduce((sum, e) => sum + Number(e.amount), 0),
    [allEntries, month, year],
  );
  const avgMonthly = useMemo(() => {
    const uniqueMonths = new Set(allEntries.map((e) => `${e.year}-${e.month}`)).size;
    return uniqueMonths > 0 ? totalContributed / uniqueMonths : 0;
  }, [allEntries, totalContributed]);

  const goalTargetNum = goal ? Number(goal.targetAmount) : null;
  const goalPct = goalTargetNum !== null ? Math.min(100, (totalContributed / goalTargetNum) * 100) : null;
  const remainingToGoal = goalTargetNum !== null ? Math.max(0, goalTargetNum - totalContributed) : null;
  const goalReached = goalTargetNum !== null && totalContributed >= goalTargetNum;
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
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5">

      {/* Card header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-green-950">
            {category.emoji && <span className="mr-2">{category.emoji}</span>}
            {category.name}
          </h2>
          {goalPct !== null && !goalReached && (
            <p className="mt-0.5 text-sm text-blue-500">{Math.round(goalPct)}% to goal</p>
          )}
          {goalReached && <p className="mt-0.5 text-sm text-blue-500">goal reached 🎉</p>}
        </div>
        <button
          type="button"
          onClick={() => { setGoalName(goal?.name ?? category.name); setGoalTarget(goal ? String(Number(goal.targetAmount)) : ""); setShowGoalForm((v) => !v); }}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-600 transition hover:border-blue-300 hover:text-blue-800"
        >
          <Pencil size={12} />
          {goal ? "edit goal" : "set goal"}
        </button>
      </div>

      {/* Goal form */}
      {showGoalForm && (
        <form onSubmit={handleGoalSubmit} className="mb-5 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              {goal ? "edit goal" : "set a goal"}
            </p>
            <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer text-blue-400 transition hover:text-blue-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. Retirement fund"
              className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-base text-green-950 outline-none placeholder:text-blue-200"
            />
            <div className="flex items-center rounded-xl border border-blue-200 bg-white px-3 py-2">
              <span className="mr-1 text-base text-blue-400">$</span>
              <input
                value={goalTarget} onChange={(e) => setGoalTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="500,000" inputMode="decimal"
                className="w-24 bg-transparent font-mono text-base tabular-nums text-green-950 outline-none placeholder:text-blue-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-blue-400 transition hover:text-blue-600">
              cancel
            </button>
            <button
              type="submit" disabled={upsertGoal.isPending || !goalTarget}
              className="cursor-pointer rounded-full bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-400"
            >
              {upsertGoal.isPending ? "saving…" : "save goal"}
            </button>
          </div>
        </form>
      )}

      {/* Total contributed + goal progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-green-950">
              {entriesQuery.isLoading
                ? <span className="inline-block h-9 w-32 animate-pulse rounded-lg bg-blue-100" />
                : fmt(totalContributed)}
            </p>
            <p className="mt-0.5 text-sm text-green-500">
              {goalTargetNum !== null ? `of ${fmt(goalTargetNum)} · ${goal!.name}` : "total contributed · no goal set"}
            </p>
          </div>
          {monthsToGoal !== null && (
            <p className="mb-0.5 text-sm text-blue-400">~{monthsToGoal} mo to goal</p>
          )}
        </div>
        {goalTargetNum !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${goalReached ? "bg-blue-300" : "bg-blue-400"}`}
              style={{ width: `${goalPct ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* This month stats */}
      <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm text-blue-600">this month</p>
          <p className="font-mono text-sm tabular-nums text-blue-700">
            {fmt(thisMonthTotal)}
            {monthlyAllocation > 0 && <span className="text-blue-400"> of {fmt(monthlyAllocation)}</span>}
          </p>
        </div>
        {monthlyAllocation > 0 ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${monthlyPct}%` }} />
          </div>
        ) : (
          <p className="text-sm text-blue-400">no monthly allocation — set one in the budget split</p>
        )}
        {avgMonthly > 0 && (
          <div className="mt-2.5 flex items-center justify-between border-t border-blue-100 pt-2.5">
            <p className="text-sm text-blue-600">avg / month</p>
            <p className={`font-mono text-sm font-medium tabular-nums ${avgMonthly >= monthlyAllocation && monthlyAllocation > 0 ? "text-blue-500" : "text-blue-700"}`}>
              {fmt(avgMonthly)}
            </p>
          </div>
        )}
      </div>

      {/* Add contribution */}
      {!showAddForm ? (
        <button
          type="button" onClick={() => setShowAddForm(true)}
          className="mb-5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 py-2.5 text-sm text-blue-400 transition hover:border-blue-300 hover:text-blue-600"
        >
          <Plus size={13} /> add contribution
        </button>
      ) : (
        <div className="mb-5 space-y-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">add contribution</p>
            <button type="button" onClick={() => { setShowAddForm(false); setAmount(""); setDescription(""); setDateMode("today"); }} className="cursor-pointer text-blue-400 transition hover:text-blue-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["today", "yesterday"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDateMode(d)}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === d ? "bg-blue-500 font-medium text-white" : "border border-blue-200 text-blue-500 hover:text-blue-700"}`}
              >{d}</button>
            ))}
            <button type="button" onClick={() => setDateMode("pick")}
              className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === "pick" ? "bg-blue-500 font-medium text-white" : "border border-blue-200 text-blue-500 hover:text-blue-700"}`}
            >{dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}</button>
            {dateMode === "pick" && (
              <input type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-sm text-blue-700 outline-none"
              />
            )}
          </div>
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <div className="flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
              <span className="mr-1 text-base text-blue-400">$</span>
              <input
                value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-20 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-blue-200"
                placeholder="0.00" inputMode="decimal" autoFocus
              />
            </div>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-base text-green-800 outline-none placeholder:text-blue-200"
              placeholder="note (optional)"
            />
            <button
              type="submit" disabled={createEntry.isPending || !amount}
              className="cursor-pointer shrink-0 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-400"
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
              <div className="h-4 w-32 animate-pulse rounded-md bg-blue-100" />
              <div className="h-4 w-16 animate-pulse rounded-md bg-blue-100" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!entriesQuery.isLoading && allEntries.length === 0 && (
        <EmptyState
          mascotSize={48}
          animate="bob"
          headline="no contributions yet"
          body="add your first entry above to start building wealth."
        />
      )}

      {/* History */}
      {!entriesQuery.isLoading && allEntries.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">history</p>
          <div className="space-y-4">
            {visibleGroups.map(([monthKey, txs]) => {
              const [yr, mo] = monthKey.split("-").map(Number);
              const label = format(new Date(yr!, mo! - 1, 1), "MMMM yyyy");
              const monthTotal = (txs ?? []).reduce((s, e) => s + Number(e.amount), 0);
              return (
                <div key={monthKey}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-green-600">{label}</p>
                    <p className="font-mono text-sm tabular-nums text-blue-400">{fmt(monthTotal)}</p>
                  </div>
                  <ul className="divide-y divide-blue-50">
                    {(txs ?? []).map((tx) => (
                      <EditableEntryRow
                        key={tx.id}
                        id={tx.id}
                        amount={Number(tx.amount)}
                        description={tx.description ?? null}
                        date={tx.date}
                        accent="blue"
                        amountPrefix="+"
                        onSaveSuccess={() => {
                          void utils.entry.listAllForCategory.invalidate({ categoryId: category.id });
                          void utils.entry.listForCategories.invalidate();
                        }}
                        onDeleteSuccess={() => {
                          void utils.entry.listAllForCategory.invalidate({ categoryId: category.id });
                          void utils.entry.listForCategories.invalidate();
                        }}
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
              className="cursor-pointer mt-3 text-sm text-blue-400 transition hover:text-blue-600"
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

export function InvestmentsPageClient() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const categoriesQuery = api.category.list.useQuery();
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const goalsQuery = api.goal.list.useQuery();

  const investmentCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === "investment"),
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
          <BackButton href="/home" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">investments</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-blue-50" />)}
        </div>
      )}

      {!isLoading && investmentCategories.length === 0 && (
        <EmptyState
          mascotSize={64}
          animate="float"
          headline="no investment categories set up"
          body="add an investment category during onboarding or in your settings."
          action={{ label: "go to settings", href: "/home" }}
        />
      )}

      {!isLoading && investmentCategories.length > 0 && (
        <div className="space-y-4">
          {investmentCategories.map((cat) => (
            <InvestmentCategoryCard
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
