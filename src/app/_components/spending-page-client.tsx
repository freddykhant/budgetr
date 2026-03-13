"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  return format(d, "EEE d MMM");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingEntry = { tempId: string; amount: number; description: string; date: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function SpendingPageClient() {
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
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [errorTempId, setErrorTempId] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddForm) amountRef.current?.focus();
  }, [showAddForm]);

  const entryDate = dateMode === "today" ? todayStr : dateMode === "yesterday" ? yesterdayStr : pickDate;

  const { data: categories } = api.category.list.useQuery();
  const { data: budget } = api.budget.getOrCreateCurrent.useQuery({ month, year });

  const spendingCategory = useMemo(() => categories?.find((c) => c.type === "spending"), [categories]);

  const spendingAllocation = useMemo(() => {
    if (!budget || !spendingCategory) return 0;
    const alloc = budget.allocations.find((a) => a.categoryId === spendingCategory.id);
    if (!alloc) return 0;
    return (Number(budget.income ?? 0) * alloc.allocationPct) / 100;
  }, [budget, spendingCategory]);

  const entryQuery = api.entry.list.useQuery(
    spendingCategory ? { categoryId: spendingCategory.id, month, year } : { categoryId: -1, month, year },
    { enabled: !!spendingCategory },
  );

  const utils = api.useUtils();

  const createEntry = api.entry.create.useMutation({
    onSuccess: (_, vars) => {
      setPendingEntries((prev) =>
        prev.filter((e) => !(e.amount === vars.amount && e.date === vars.date && e.description === (vars.description ?? ""))),
      );
      void utils.entry.list.invalidate();
    },
    onError: (_, vars) => {
      const match = pendingEntries.find(
        (e) => e.amount === vars.amount && e.date === vars.date && e.description === (vars.description ?? ""),
      );
      if (match) {
        setErrorTempId(match.tempId);
        setTimeout(() => {
          setPendingEntries((prev) => prev.filter((e) => e.tempId !== match.tempId));
          setErrorTempId(null);
        }, 1200);
      }
    },
  });

  const deleteEntry = api.entry.delete.useMutation({ onSuccess: () => void utils.entry.list.invalidate() });

  const confirmedEntries = entryQuery.data ?? [];
  const pendingTotal = pendingEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalSpent = useMemo(
    () => confirmedEntries.reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
    [confirmedEntries],
  ) + pendingTotal;

  const remaining = Math.max(0, spendingAllocation - totalSpent);
  const overspent = totalSpent > spendingAllocation;
  const usedPct = spendingAllocation ? Math.min(100, (totalSpent / spendingAllocation) * 100) : 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const dailyBudget = remaining / daysLeft;

  const barColor = usedPct > 90 ? "bg-red-400" : usedPct > 70 ? "bg-amber-400" : "bg-orange-400";
  const spentColor = usedPct > 90 ? "text-red-500" : usedPct > 70 ? "text-amber-600" : "text-green-950";

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ id: number | string; amount: string; description: string | null; date: string; isPending?: boolean; tempId?: string }>>();
    confirmedEntries.forEach((tx) => {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push({ ...tx, amount: String(tx.amount ?? 0), description: tx.description ?? null });
    });
    pendingEntries.forEach((pe) => {
      if (!map.has(pe.date)) map.set(pe.date, []);
      map.get(pe.date)!.unshift({ id: pe.tempId, amount: String(pe.amount), description: pe.description || null, date: pe.date, isPending: true, tempId: pe.tempId });
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [confirmedEntries, pendingEntries]);

  const txCount = confirmedEntries.length + pendingEntries.length;
  const isLoading = !categories || !budget || entryQuery.isLoading;

  function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && amount) { e.preventDefault(); descRef.current?.focus(); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!spendingCategory) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const desc = description.trim();
    const tempId = crypto.randomUUID();
    setAmount(""); setDescription(""); setDateMode("today");
    amountRef.current?.focus();
    setPendingEntries((prev) => [...prev, { tempId, amount: value, description: desc, date: entryDate }]);
    createEntry.mutate({ categoryId: spendingCategory.id, amount: value, date: entryDate, description: desc || undefined });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">

      {/* Page header */}
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
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">spending</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
        {spendingCategory && (
          <p className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm text-orange-600">
            {spendingCategory.emoji} {spendingCategory.name}
          </p>
        )}
      </header>

      <div className="space-y-4">

        {/* Summary card */}
        <div className="overflow-hidden rounded-2xl border border-orange-200 bg-linear-to-br from-orange-50 to-white shadow-sm shadow-orange-900/5">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
              💸 this month
            </p>

            <div className="mb-2 mt-4 flex items-end justify-between">
              <div>
                {isLoading ? (
                  <div className="h-11 w-40 animate-pulse rounded-lg bg-orange-100" />
                ) : (
                  <p className={`font-mono text-4xl font-semibold tabular-nums tracking-tight ${spentColor}`}>
                    {fmt(totalSpent)}
                  </p>
                )}
                <p className="mt-1 text-sm text-green-500">
                  of {fmt(spendingAllocation)} limit
                </p>
              </div>
              {!overspent && !isLoading && (
                <p className="mb-0.5 text-sm text-green-500">
                  {fmt(remaining)} left
                </p>
              )}
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-x-6">
              <div>
                <p className="text-xs text-green-400">used</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${usedPct > 90 ? "text-red-500" : usedPct > 70 ? "text-amber-500" : "text-green-800"}`}>
                  {Math.round(usedPct)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-green-400">{overspent ? "overspent" : "remaining"}</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${overspent ? "text-red-500" : "text-green-800"}`}>
                  {overspent ? fmt(totalSpent - spendingAllocation) : fmt(remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-400">daily · {daysLeft}d left</p>
                <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${overspent ? "text-green-400" : "text-green-800"}`}>
                  {overspent ? "—" : fmt(dailyBudget)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add transaction */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-dashed border-green-200 py-3 text-sm text-green-500 transition hover:border-green-300 hover:text-green-700"
          >
            <Plus size={14} /> add transaction
          </button>
        ) : (
          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400">add transaction</p>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAmount(""); setDescription(""); setDateMode("today"); }}
                className="cursor-pointer text-green-400 transition hover:text-green-600"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {(["today", "yesterday"] as const).map((d) => (
                <button
                  key={d} type="button" onClick={() => setDateMode(d)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === d ? "bg-green-500 font-medium text-white" : "border border-green-200 text-green-600 hover:text-green-800"}`}
                >
                  {d}
                </button>
              ))}
              <button
                type="button" onClick={() => setDateMode("pick")}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${dateMode === "pick" ? "bg-green-500 font-medium text-white" : "border border-green-200 text-green-600 hover:text-green-800"}`}
              >
                {dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}
              </button>
              {dateMode === "pick" && (
                <input
                  type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)}
                  className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700 outline-none"
                />
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                <span className="mr-1 text-base text-green-500">$</span>
                <input
                  ref={amountRef}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  onKeyDown={handleAmountKeyDown}
                  className="w-24 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                  placeholder="0.00" inputMode="decimal" autoComplete="off"
                />
              </div>
              <input
                ref={descRef} value={description} onChange={(e) => setDescription(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-base text-green-800 outline-none placeholder:text-green-300"
                placeholder="what was it for?"
              />
              <button
                type="submit" disabled={!amount || !spendingCategory}
                className="cursor-pointer shrink-0 rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
              >
                add
              </button>
            </form>
          </div>
        )}

        {/* Transaction feed */}
        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">this month</p>
            {txCount > 0 && (
              <p className="text-sm text-green-400">{txCount} {txCount === 1 ? "transaction" : "transactions"}</p>
            )}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 animate-pulse rounded-md bg-green-100" />
                    <div className="h-3 w-14 animate-pulse rounded-md bg-green-50" />
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded-md bg-green-100" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && txCount === 0 && (
            <div className="py-6 text-center">
              <p className="text-base text-green-500">no transactions yet.</p>
              <p className="mt-1 text-sm text-green-400">add your first one above to start tracking.</p>
            </div>
          )}

          {!isLoading && txCount > 0 && (
            <div className="space-y-5">
              {grouped.map(([dateStr, txs]) => (
                <div key={dateStr}>
                  <p className="mb-2 text-sm font-medium text-green-600">{dateLabel(dateStr)}</p>
                  <ul className="divide-y divide-green-100">
                    {(txs ?? []).map((tx) => {
                      const isError = tx.isPending && tx.tempId === errorTempId;
                      return (
                        <li
                          key={tx.id}
                          className={`group flex items-center justify-between py-2.5 transition-all duration-300 ${
                            isError ? "-translate-x-2 opacity-0" : tx.isPending ? "opacity-50" : "opacity-100"
                          }`}
                        >
                          <p className={`text-base ${tx.isPending ? "italic text-green-600" : "text-green-800"}`}>
                            {tx.description ?? <span className="not-italic text-green-400">no description</span>}
                          </p>
                          <div className="flex items-center gap-3">
                            <p className={`font-mono text-base tabular-nums ${tx.isPending ? "text-green-500" : "text-green-800"}`}>
                              {fmtFull(Number(tx.amount))}
                            </p>
                            {tx.isPending ? (
                              <Loader2 size={14} className="animate-spin text-green-400" />
                            ) : (
                              <button
                                type="button" onClick={() => deleteEntry.mutate({ id: tx.id as number })}
                                disabled={deleteEntry.isPending}
                                className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label="Delete transaction"
                              >
                                <Trash2 size={14} className="text-green-400 transition hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
