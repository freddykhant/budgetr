"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { api } from "~/trpc/react";
import { SpendingCard } from "./spending-card";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function SpendingPageClient() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(today, "yyyy-MM-dd"));

  // Load categories and budget
  const { data: categories } = api.category.list.useQuery();
  const { data: budget } = api.budget.getOrCreateCurrent.useQuery({ month, year });

  // For v1, we treat the first `spending` category as the primary bucket.
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
    const income = Number(budget.income ?? 0);
    return (income * alloc.allocationPct) / 100;
  }, [budget, spendingCategory]);

  const entryQuery = api.entry.list.useQuery(
    spendingCategory
      ? { categoryId: spendingCategory.id, month, year }
      : // Dummy input while we don't have a category
        { categoryId: -1, month, year },
    {
      enabled: !!spendingCategory,
    },
  );

  const createEntry = api.entry.create.useMutation({
    onSuccess: () => {
      void entryQuery.refetch();
      setAmount("");
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
    },
  });

  const totalSpent = useMemo(() => {
    if (!entryQuery.data) return 0;
    return entryQuery.data.reduce(
      (sum, e) => sum + Number(e.amount ?? 0),
      0,
    );
  }, [entryQuery.data]);

  const isLoading = !categories || !budget || entryQuery.isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendingCategory) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;

    createEntry.mutate({
      categoryId: spendingCategory.id,
      amount: value,
      date,
      description: description || undefined,
    });
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-neutral-400 transition hover:border-white/20 hover:text-neutral-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">spending</h1>
            <p className="mt-1 text-sm text-neutral-500">
              track where your money went this month.
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-600">
          {format(today, "MMMM yyyy")}
        </p>
      </header>

      <section className="space-y-6">
        <SpendingCard
          className=""
          spent={totalSpent}
          limit={spendingAllocation || 1}
        />

        {/* Add transaction */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.06] bg-[#111111] p-4 md:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              add transaction
            </p>
            {spendingCategory && (
              <p className="text-xs text-neutral-600">
                category:{" "}
                <span className="font-medium text-neutral-300">
                  {spendingCategory.emoji} {spendingCategory.name}
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                amount
              </label>
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2">
                <span className="mr-1 text-sm text-neutral-600">$</span>
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:text-neutral-600"
                  placeholder="42.50"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                note
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
                placeholder="groceries, uber, dinner..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  createEntry.isPending ||
                  !amount ||
                  !spendingCategory
                }
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-200"
              >
                {createEntry.isPending ? "adding…" : "add"}
              </button>
            </div>
          </div>
        </form>

        {/* Transactions list */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#101010] p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              this month
            </p>
            {entryQuery.data && entryQuery.data.length > 0 && (
              <p className="text-xs text-neutral-500">
                {entryQuery.data.length}{" "}
                {entryQuery.data.length === 1 ? "transaction" : "transactions"}
              </p>
            )}
          </div>

          {isLoading && (
            <p className="text-xs text-neutral-600">loading spending…</p>
          )}

          {!isLoading && (!entryQuery.data || entryQuery.data.length === 0) && (
            <p className="text-xs text-neutral-600">
              no transactions yet. start by adding your first one above.
            </p>
          )}

          {entryQuery.data && entryQuery.data.length > 0 && (
            <ul className="mt-2 divide-y divide-white/[0.04] text-sm">
              {entryQuery.data.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-neutral-100">
                      {tx.description ?? "transaction"}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {format(new Date(tx.date), "dd MMM")}
                    </p>
                  </div>
                  <p className="font-mono tabular-nums text-neutral-100">
                    {fmt(Number(tx.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

