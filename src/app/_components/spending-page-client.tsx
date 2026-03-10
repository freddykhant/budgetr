"use client";

import { useMemo, useRef, useState } from "react";
import {
  format,
  isToday,
  isYesterday,
  parseISO,
  subDays,
} from "date-fns";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

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

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  return format(d, "EEE d MMM");
}

function CircularProgress({
  value,
  total,
  color,
  size = 140,
  strokeWidth = 9,
}: {
  value: number;
  total: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const safeTotal = total || 1;
  const pct = Math.min(100, (value / safeTotal) * 100);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-orange-100" />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
        className={`${color.replace("bg-", "stroke-")} transition-all duration-500`}
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpendingPageClient() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">("today");
  const [pickDate, setPickDate] = useState(todayStr);
  const descRef = useRef<HTMLInputElement>(null);

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

  const createEntry = api.entry.create.useMutation({
    onSuccess: () => {
      void entryQuery.refetch();
      setAmount("");
      setDescription("");
      setDateMode("today");
    },
  });

  const deleteEntry = api.entry.delete.useMutation({
    onSuccess: () => void entryQuery.refetch(),
  });

  const totalSpent = useMemo(
    () => (entryQuery.data ?? []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
    [entryQuery.data],
  );

  const remaining = Math.max(0, spendingAllocation - totalSpent);
  const overspent = totalSpent > spendingAllocation;
  const usedPct = spendingAllocation ? Math.min(100, (totalSpent / spendingAllocation) * 100) : 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const dailyBudget = remaining / daysLeft;

  const barColor = usedPct > 90 ? "bg-red-400" : usedPct > 70 ? "bg-amber-400" : "bg-orange-400";

  const txData = entryQuery.data;
  const grouped = useMemo(() => {
    const txs = txData ?? [];
    const map = new Map<string, typeof txs>();
    txs.forEach((tx) => {
      const key = tx.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [txData]);

  function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && amount) {
      e.preventDefault();
      descRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!spendingCategory) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({
      categoryId: spendingCategory.id,
      amount: value,
      date: entryDate,
      description: description.trim() || undefined,
    });
  }

  const isLoading = !categories || !budget || entryQuery.isLoading;
  const txCount = entryQuery.data?.length ?? 0;

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
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">spending</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
        {spendingCategory && (
          <p className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-600">
            {spendingCategory.emoji} {spendingCategory.name}
          </p>
        )}
      </header>

      <div className="space-y-4">
        {/* Summary card */}
        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
          <div className="mb-6 flex items-center gap-6">
            <div className="relative flex shrink-0 items-center justify-center">
              <CircularProgress value={totalSpent} total={spendingAllocation} color={barColor} size={140} strokeWidth={9} />
              <span className="absolute font-mono text-2xl font-semibold tabular-nums text-orange-600">
                {Math.round(usedPct)}%
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm uppercase tracking-[0.18em] text-green-500">spent</p>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-green-950">
                {fmt(totalSpent)}
              </p>
              <p className="text-base text-green-600">of {fmt(spendingAllocation)} limit</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-green-50 px-3 py-2.5">
              <p className="text-sm text-green-500">used</p>
              <p className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${usedPct > 90 ? "text-red-500" : usedPct > 70 ? "text-amber-500" : "text-green-950"}`}>
                {Math.round(usedPct)}%
              </p>
            </div>
            <div className="rounded-xl bg-green-50 px-3 py-2.5">
              <p className="text-sm text-green-500">{overspent ? "overspent" : "remaining"}</p>
              <p className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${overspent ? "text-red-500" : "text-green-600"}`}>
                {overspent ? fmt(totalSpent - spendingAllocation) : fmt(remaining)}
              </p>
            </div>
            <div className="rounded-xl bg-green-50 px-3 py-2.5">
              <p className="text-sm text-green-500">daily · {daysLeft}d left</p>
              <p className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${overspent ? "text-green-400" : "text-green-950"}`}>
                {overspent ? "—" : fmt(dailyBudget)}
              </p>
            </div>
          </div>
        </div>

        {/* Add transaction */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-green-500">add transaction</p>

          <div className="mb-3 flex items-center gap-1.5">
            {(["today", "yesterday"] as const).map((d) => (
              <button
                key={d} type="button" onClick={() => setDateMode(d)}
                className={`rounded-full px-3 py-1 text-sm transition ${dateMode === d ? "bg-green-500 text-white font-medium" : "border border-green-200 text-green-600 hover:text-green-800"}`}
              >
                {d}
              </button>
            ))}
            <button
              type="button" onClick={() => setDateMode("pick")}
              className={`rounded-full px-3 py-1 text-sm transition ${dateMode === "pick" ? "bg-green-500 text-white font-medium" : "border border-green-200 text-green-600 hover:text-green-800"}`}
            >
              {dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}
            </button>
            {dateMode === "pick" && (
              <input
                type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)}
                className="ml-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700 outline-none"
              />
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
              <span className="text-base text-green-500">$</span>
              <input
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
              type="submit" disabled={createEntry.isPending || !amount || !spendingCategory}
              className="shrink-0 rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              {createEntry.isPending ? "adding…" : "add"}
            </button>
          </div>
        </form>

        {/* Transaction feed */}
        <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.18em] text-green-500">this month</p>
            {txCount > 0 && (
              <p className="text-sm text-green-500">{txCount} {txCount === 1 ? "transaction" : "transactions"}</p>
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
                    {(txs ?? []).map((tx) => (
                      <li key={tx.id} className="group flex items-center justify-between py-2.5">
                        <p className="text-base text-green-800">
                          {tx.description ?? <span className="text-green-400">no description</span>}
                        </p>
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-base tabular-nums text-green-800">{fmtFull(Number(tx.amount))}</p>
                          <button
                            type="button" onClick={() => deleteEntry.mutate({ id: tx.id })}
                            disabled={deleteEntry.isPending}
                            className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete transaction"
                          >
                            <Trash2 size={14} className="text-green-400 transition hover:text-red-500" />
                          </button>
                        </div>
                      </li>
                    ))}
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
