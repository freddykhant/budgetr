"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";
import { useToast } from "./toast-provider";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function CustomCategoryPageClient({
  categoryId, categoryName, categoryEmoji,
}: {
  categoryId: number; categoryName: string; categoryEmoji: string | null;
}) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">("today");
  const [pickDate, setPickDate] = useState(todayStr);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState(categoryName);
  const [goalTarget, setGoalTarget] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const entryDate = dateMode === "today" ? todayStr : dateMode === "yesterday" ? yesterdayStr : pickDate;

  const entriesQuery = api.entry.listAllForCategory.useQuery({ categoryId });
  const goalQuery = api.goal.get.useQuery({ categoryId });
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });

  const utils = api.useUtils();
  const { showToast } = useToast();
  const createEntry = api.entry.create.useMutation({
    onSuccess: (_, vars) => {
      void entriesQuery.refetch();
      setAmount(""); setDescription(""); setDateMode("today"); setShowAddForm(false);

      const amt = vars.amount;
      const newTotal = totalLogged + amt;
      if (goalTargetNum !== null) {
        const oldPct = goalTargetNum > 0 ? (totalLogged / goalTargetNum) * 100 : 0;
        const newPct = goalTargetNum > 0 ? (newTotal / goalTargetNum) * 100 : 0;
        if (newPct >= 100 && oldPct < 100) {
          showToast(`🏆 Goal reached! ${categoryName} is complete.`, "celebration", 4500);
        } else if (newPct >= 75 && oldPct < 75) {
          showToast(`🎯 75% to ${goal?.name ?? categoryName}. So close!`, "celebration");
        } else if (newPct >= 50 && oldPct < 50) {
          showToast(`📍 Halfway to ${goal?.name ?? categoryName}. Keep going!`, "success");
        } else if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} added to ${categoryName}. Big push!`, "celebration");
        } else if (amt >= 100) {
          showToast(`💰 ${fmt(amt)} logged to ${categoryName}.`, "success");
        }
      } else {
        if (amt >= 500) {
          showToast(`🚀 ${fmt(amt)} added to ${categoryName}. Nice chunk!`, "celebration");
        } else if (amt >= 100) {
          showToast(`💰 ${fmt(amt)} logged to ${categoryName}.`, "success");
        }
      }
    },
  });
  const deleteEntry = api.entry.delete.useMutation({ onSuccess: () => void entriesQuery.refetch() });
  const upsertGoal = api.goal.upsert.useMutation({
    onSuccess: (_, vars) => {
      void utils.goal.get.invalidate({ categoryId });
      void utils.goal.list.invalidate();
      setShowGoalForm(false);
      const isNew = !goal;
      showToast(
        isNew
          ? `🎯 Goal set — ${fmt(Number(vars.targetAmount))} for ${categoryName}.`
          : "Goal updated.",
        isNew ? "celebration" : "success",
      );
    },
  });
  const deleteGoal = api.goal.delete.useMutation({
    onSuccess: () => {
      void utils.goal.get.invalidate({ categoryId });
      void utils.goal.list.invalidate();
    },
  });

  const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const totalLogged = useMemo(() => allEntries.reduce((sum, e) => sum + Number(e.amount), 0), [allEntries]);
  const thisMonthEntries = useMemo(() => allEntries.filter((e) => e.month === month && e.year === year), [allEntries, month, year]);
  const thisMonthTotal = useMemo(() => thisMonthEntries.reduce((sum, e) => sum + Number(e.amount), 0), [thisMonthEntries]);
  const avgMonthly = useMemo(() => {
    const uniqueMonths = new Set(allEntries.map((e) => `${e.year}-${e.month}`)).size;
    return uniqueMonths > 0 ? totalLogged / uniqueMonths : 0;
  }, [allEntries, totalLogged]);

  const monthlyAllocation = useMemo(() => {
    if (!budgetQuery.data) return 0;
    const income = Number(budgetQuery.data.income ?? 0);
    const alloc = budgetQuery.data.allocations.find((a) => a.categoryId === categoryId);
    return alloc ? (income * alloc.allocationPct) / 100 : 0;
  }, [budgetQuery.data, categoryId]);

  const monthlyPct = monthlyAllocation ? Math.min(100, (thisMonthTotal / monthlyAllocation) * 100) : 0;
  const goal = goalQuery.data;
  const goalTargetNum = goal ? Number(goal.targetAmount) : null;
  const goalPct = goalTargetNum !== null ? Math.min(100, (totalLogged / goalTargetNum) * 100) : null;
  const remainingToGoal = goalTargetNum !== null ? Math.max(0, goalTargetNum - totalLogged) : null;
  const goalReached = goalTargetNum !== null && totalLogged >= goalTargetNum;
  const monthsToGoal = monthlyAllocation > 0 && remainingToGoal !== null && remainingToGoal > 0 ? Math.ceil(remainingToGoal / monthlyAllocation) : null;

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
  const isLoading = entriesQuery.isLoading || budgetQuery.isLoading;
  const displayName = `${categoryEmoji ? categoryEmoji + " " : ""}${categoryName}`;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({ categoryId, amount: value, date: entryDate, description: description.trim() || undefined });
  }

  function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(goalTarget);
    if (!Number.isFinite(value) || value <= 0) return;
    upsertGoal.mutate({ categoryId, name: goalName.trim() || categoryName, targetAmount: value });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/home" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-600 transition hover:border-green-300 hover:text-green-800" aria-label="Back to dashboard">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">{displayName}</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
      </header>

      <div className="space-y-4">

        {/* Monthly card */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-900/5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-400">this month</p>

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-green-950">
                {isLoading ? <span className="inline-block h-10 w-28 animate-pulse rounded-lg bg-violet-100" /> : fmt(thisMonthTotal)}
              </p>
              {monthlyAllocation > 0 && (
                <p className="mt-1 text-sm text-green-500">of {fmt(monthlyAllocation)} allocated</p>
              )}
            </div>
            {monthlyAllocation > 0 && (
              <p className={`mb-1 font-mono text-base tabular-nums ${monthlyPct > 100 ? "text-red-500" : monthlyPct >= 80 ? "text-amber-500" : "text-violet-500"}`}>
                {Math.round(monthlyPct)}%
              </p>
            )}
          </div>

          {monthlyAllocation > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${monthlyPct > 100 ? "bg-red-400" : monthlyPct >= 80 ? "bg-amber-400" : "bg-violet-400"}`}
                style={{ width: `${Math.min(100, monthlyPct)}%` }}
              />
            </div>
          )}

          {!isLoading && (
            <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-violet-600">total logged</p>
                <p className="font-mono text-sm font-medium tabular-nums text-violet-700">{fmt(totalLogged)}</p>
              </div>
              {avgMonthly > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-violet-100 pt-2">
                  <p className="text-sm text-violet-600">avg / month</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-violet-700">{fmt(avgMonthly)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goal card */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-900/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">goal</p>
            <div className="flex items-center gap-2">
              {goal && (
                <button
                  type="button" onClick={() => deleteGoal.mutate({ categoryId })} disabled={deleteGoal.isPending}
                  className="cursor-pointer text-sm text-green-400 transition hover:text-red-500 disabled:cursor-not-allowed"
                >
                  remove
                </button>
              )}
              <button
                type="button"
                onClick={() => { setGoalName(goal?.name ?? categoryName); setGoalTarget(goal ? String(Number(goal.targetAmount)) : ""); setShowGoalForm((v) => !v); }}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-600 transition hover:border-violet-300 hover:text-violet-800"
              >
                <Pencil size={12} /> {goal ? "edit" : "set goal"}
              </button>
            </div>
          </div>

          {showGoalForm && (
            <form onSubmit={handleGoalSubmit} className="mt-4 space-y-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                  {goal ? "update goal" : "create a goal"}
                </p>
                <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer text-violet-400 transition hover:text-violet-600">
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name"
                  className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-base text-green-950 outline-none placeholder:text-violet-300"
                />
                <div className="flex items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                  <span className="mr-1 text-base text-violet-400">$</span>
                  <input
                    value={goalTarget} onChange={(e) => setGoalTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="5,000" inputMode="decimal"
                    className="w-24 bg-transparent font-mono text-base tabular-nums text-green-950 outline-none placeholder:text-violet-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowGoalForm(false)} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-violet-400 transition hover:text-violet-600">
                  cancel
                </button>
                <button
                  type="submit" disabled={upsertGoal.isPending || !goalTarget}
                  className="cursor-pointer rounded-full bg-violet-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-violet-200 disabled:text-violet-400"
                >
                  {upsertGoal.isPending ? "saving…" : "save"}
                </button>
              </div>
            </form>
          )}

          {!showGoalForm && goal && goalTargetNum !== null && (
            <div className="mt-4">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">{fmt(totalLogged)}</p>
                  <p className="mt-0.5 text-sm text-green-500">of {fmt(goalTargetNum)} · {goal.name}</p>
                </div>
                <div className="mb-0.5 text-right">
                  {goalReached ? (
                    <p className="text-sm text-violet-500">goal reached 🎉</p>
                  ) : (
                    <>
                      <p className="font-mono text-base tabular-nums text-green-800">{Math.round(goalPct ?? 0)}%</p>
                      {monthsToGoal !== null && <p className="text-sm text-violet-400">~{monthsToGoal} mo to go</p>}
                    </>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${goalReached ? "bg-violet-300" : "bg-violet-400"}`}
                  style={{ width: `${goalPct ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {!showGoalForm && !goal && (
            <p className="mt-3 text-sm text-green-400">no goal set — click &quot;set goal&quot; to track progress toward a target.</p>
          )}
        </div>

        {/* Log entry */}
        {!showAddForm ? (
          <button
            type="button" onClick={() => setShowAddForm(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-200 py-3 text-sm text-violet-400 transition hover:border-violet-300 hover:text-violet-600"
          >
            <Plus size={13} /> log entry
          </button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-900/5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">log entry</p>
              <button type="button" onClick={() => { setShowAddForm(false); setAmount(""); setDescription(""); setDateMode("today"); }} className="cursor-pointer text-violet-400 transition hover:text-violet-600">
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["today", "yesterday"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDateMode(d)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === d ? "bg-violet-500 font-medium text-white" : "border border-violet-200 text-violet-500 hover:text-violet-700"}`}
                >{d}</button>
              ))}
              <button type="button" onClick={() => setDateMode("pick")}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === "pick" ? "bg-violet-500 font-medium text-white" : "border border-violet-200 text-violet-500 hover:text-violet-700"}`}
              >
                {dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}
              </button>
              {dateMode === "pick" && (
                <input type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-sm text-violet-700 outline-none"
                />
              )}
            </div>
            <form onSubmit={handleAddSubmit} className="flex gap-2">
              <div className="flex items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                <span className="mr-1 text-base text-violet-400">$</span>
                <input
                  value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-20 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-violet-300"
                  placeholder="0.00" inputMode="decimal" autoFocus
                />
              </div>
              <input
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-base text-green-800 outline-none placeholder:text-violet-300"
                placeholder="note (optional)"
              />
              <button
                type="submit" disabled={createEntry.isPending || !amount}
                className="cursor-pointer shrink-0 rounded-full bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-violet-200 disabled:text-violet-400"
              >
                {createEntry.isPending ? "saving…" : "save"}
              </button>
            </form>
          </div>
        )}

        {/* History */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm shadow-violet-900/5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">history</p>
            {allEntries.length > 0 && (
              <p className="text-sm text-violet-400">{allEntries.length} {allEntries.length === 1 ? "entry" : "entries"}</p>
            )}
          </div>

          {entriesQuery.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="h-4 w-32 animate-pulse rounded-md bg-violet-100" />
                  <div className="h-4 w-16 animate-pulse rounded-md bg-violet-100" />
                </div>
              ))}
            </div>
          )}

          {!entriesQuery.isLoading && allEntries.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-base text-green-500">no entries yet.</p>
              <p className="mt-1 text-sm text-green-400">log your first entry above to start tracking.</p>
            </div>
          )}

          {!entriesQuery.isLoading && allEntries.length > 0 && (
            <div className="space-y-5">
              {visibleGroups.map(([monthKey, entries]) => {
                const [yr, mo] = monthKey.split("-").map(Number);
                const label = format(new Date(yr!, mo! - 1, 1), "MMMM yyyy");
                const monthTotal = (entries ?? []).reduce((s, e) => s + Number(e.amount), 0);
                return (
                  <div key={monthKey}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-medium text-green-600">{label}</p>
                      <p className="font-mono text-sm tabular-nums text-violet-400">{fmt(monthTotal)}</p>
                    </div>
                    <ul className="divide-y divide-violet-50">
                      {(entries ?? []).map((entry) => (
                        <li key={entry.id} className="group flex items-center justify-between py-2.5">
                          <p className="text-base text-green-800">{entry.description ?? <span className="text-green-400">entry</span>}</p>
                          <div className="flex items-center gap-3">
                            <p className="font-mono text-base tabular-nums text-violet-500">{fmtFull(Number(entry.amount))}</p>
                            <button
                              type="button" onClick={() => deleteEntry.mutate({ id: entry.id })} disabled={deleteEntry.isPending}
                              className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete entry"
                            >
                              <Trash2 size={14} className="text-green-400 transition hover:text-red-500" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <button type="button" onClick={() => setShowAllHistory((v) => !v)} className="cursor-pointer text-sm text-violet-400 transition hover:text-violet-600">
                  {showAllHistory ? "show less" : `show ${hiddenCount} more ${hiddenCount === 1 ? "month" : "months"}`}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
