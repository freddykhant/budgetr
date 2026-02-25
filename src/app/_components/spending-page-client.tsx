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

// ─── Component ────────────────────────────────────────────────────────────────

export function SpendingPageClient() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  // ── Form state ──────────────────────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">(
    "today",
  );
  const [pickDate, setPickDate] = useState(todayStr);
  const descRef = useRef<HTMLInputElement>(null);

  const entryDate =
    dateMode === "today"
      ? todayStr
      : dateMode === "yesterday"
        ? yesterdayStr
        : pickDate;

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: categories } = api.category.list.useQuery();
  const { data: budget } = api.budget.getOrCreateCurrent.useQuery({
    month,
    year,
  });

  const spendingCategory = useMemo(
    () => categories?.find((c) => c.type === "spending"),
    [categories],
  );

  const spendingAllocation = useMemo(() => {
    if (!budget || !spendingCategory) return 0;
    const alloc = budget.allocations.find(
      (a) => a.categoryId === spendingCategory.id,
    );
    if (!alloc) return 0;
    return (Number(budget.income ?? 0) * alloc.allocationPct) / 100;
  }, [budget, spendingCategory]);

  const entryQuery = api.entry.list.useQuery(
    spendingCategory
      ? { categoryId: spendingCategory.id, month, year }
      : { categoryId: -1, month, year },
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

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalSpent = useMemo(
    () =>
      (entryQuery.data ?? []).reduce(
        (sum, e) => sum + Number(e.amount ?? 0),
        0,
      ),
    [entryQuery.data],
  );

  const remaining = Math.max(0, spendingAllocation - totalSpent);
  const overspent = totalSpent > spendingAllocation;
  const usedPct = spendingAllocation
    ? Math.min(100, (totalSpent / spendingAllocation) * 100)
    : 0;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const dailyBudget = remaining / daysLeft;

  const barColor =
    usedPct > 90
      ? "bg-red-400"
      : usedPct > 70
        ? "bg-amber-400"
        : "bg-orange-400";

  // ── Grouped transactions ──────────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────
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
            <h1 className="text-xl font-semibold tracking-tight">spending</h1>
            <p className="text-xs text-neutral-600">
              {format(today, "MMMM yyyy")}
            </p>
          </div>
        </div>
        {spendingCategory && (
          <p className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-xs text-neutral-500">
            {spendingCategory.emoji} {spendingCategory.name}
          </p>
        )}
      </header>

      <div className="space-y-4">
        {/* ── Summary card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          {/* Spent vs limit */}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                spent
              </p>
              <p className="mt-1.5 font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {fmt(totalSpent)}
              </p>
            </div>
            <p className="mb-1 font-mono text-sm tabular-nums text-neutral-500">
              of {fmt(spendingAllocation)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>

          {/* Stat chips */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs text-neutral-600">used</p>
              <p
                className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                  usedPct > 90
                    ? "text-red-400"
                    : usedPct > 70
                      ? "text-amber-400"
                      : "text-neutral-100"
                }`}
              >
                {Math.round(usedPct)}%
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs text-neutral-600">
                {overspent ? "overspent" : "remaining"}
              </p>
              <p
                className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                  overspent ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {overspent ? fmt(totalSpent - spendingAllocation) : fmt(remaining)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs text-neutral-600">
                daily budget · {daysLeft}d left
              </p>
              <p
                className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                  overspent ? "text-neutral-600" : "text-neutral-100"
                }`}
              >
                {overspent ? "—" : fmt(dailyBudget)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Add transaction ───────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
            add transaction
          </p>

          {/* Date chips */}
          <div className="mb-3 flex items-center gap-1.5">
            {(["today", "yesterday"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateMode(d)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  dateMode === d
                    ? "bg-white text-black font-medium"
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
                  ? "bg-white text-black font-medium"
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
                className="ml-1 rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-neutral-300 outline-none"
              />
            )}
          </div>

          {/* Inputs */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5">
              <span className="text-sm text-neutral-600">$</span>
              <input
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                onKeyDown={handleAmountKeyDown}
                className="w-24 bg-transparent font-mono text-sm font-semibold tabular-nums outline-none placeholder:text-neutral-700"
                placeholder="0.00"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>

            <input
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
              placeholder="what was it for?"
            />

            <button
              type="submit"
              disabled={createEntry.isPending || !amount || !spendingCategory}
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {createEntry.isPending ? "adding…" : "add"}
            </button>
          </div>
        </form>

        {/* ── Transaction feed ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              this month
            </p>
            {txCount > 0 && (
              <p className="text-xs text-neutral-600">
                {txCount} {txCount === 1 ? "transaction" : "transactions"}
              </p>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 animate-pulse rounded-md bg-white/[0.05]" />
                    <div className="h-2.5 w-14 animate-pulse rounded-md bg-white/[0.03]" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded-md bg-white/[0.05]" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && txCount === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-neutral-600">no transactions yet.</p>
              <p className="mt-1 text-xs text-neutral-700">
                add your first one above to start tracking.
              </p>
            </div>
          )}

          {/* Grouped list */}
          {!isLoading && txCount > 0 && (
            <div className="space-y-5">
              {grouped.map(([dateStr, txs]) => (
                <div key={dateStr}>
                  {/* Date heading */}
                  <p className="mb-2 text-xs font-medium text-neutral-600">
                    {dateLabel(dateStr)}
                  </p>

                  <ul className="divide-y divide-white/[0.04]">
                    {(txs ?? []).map((tx) => (
                      <li
                        key={tx.id}
                        className="group flex items-center justify-between py-2.5"
                      >
                        <p className="text-sm text-neutral-200">
                          {tx.description ?? (
                            <span className="text-neutral-600">
                              no description
                            </span>
                          )}
                        </p>

                        <div className="flex items-center gap-3">
                          <p className="font-mono text-sm tabular-nums text-neutral-200">
                            {fmtFull(Number(tx.amount))}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              deleteEntry.mutate({ id: tx.id })
                            }
                            disabled={deleteEntry.isPending}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Delete transaction"
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
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
