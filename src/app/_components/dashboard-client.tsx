"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { api } from "~/trpc/react";
import { SpendingCard } from "./spending-card";

type DashboardClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function typeColor(type: string | null | undefined) {
  switch (type) {
    case "spending":
      return "bg-orange-400";
    case "saving":
      return "bg-emerald-400";
    case "investment":
      return "bg-blue-400";
    case "credit_card":
      return "bg-amber-400";
    default:
      return "bg-neutral-500";
  }
}

export function DashboardClient({ user }: DashboardClientProps) {
  const firstName = user.name?.split(" ")[0] ?? "hey";
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Budget + categories
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const categoriesQuery = api.category.list.useQuery();

  // Income editing state
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [draftIncome, setDraftIncome] = useState("");
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const updateBudget = api.budget.update.useMutation({
    onSuccess: () => {
      void budgetQuery.refetch();
      setIsEditingIncome(false);
      setIncomeError(null);
    },
  });

  const incomeNum = useMemo(
    () => Number(budgetQuery.data?.income ?? 0),
    [budgetQuery.data],
  );

  useEffect(() => {
    if (budgetQuery.data) {
      setDraftIncome(
        budgetQuery.data.income ? String(Number(budgetQuery.data.income)) : "",
      );
    }
  }, [budgetQuery.data]);

  // Live spending summary (same logic as spending page, but condensed)
  const spendingCategory = useMemo(
    () => categoriesQuery.data?.find((c) => c.type === "spending"),
    [categoriesQuery.data],
  );

  const spendingAllocation = useMemo(() => {
    if (!budgetQuery.data || !spendingCategory) return 0;
    const alloc = budgetQuery.data.allocations.find(
      (a) => a.categoryId === spendingCategory.id,
    );
    if (!alloc) return 0;
    return (incomeNum * alloc.allocationPct) / 100;
  }, [budgetQuery.data, spendingCategory, incomeNum]);

  const entriesQuery = api.entry.list.useQuery(
    spendingCategory
      ? { categoryId: spendingCategory.id, month, year }
      : { categoryId: -1, month, year },
    {
      enabled: !!spendingCategory,
    },
  );

  const totalSpent = useMemo(() => {
    if (!entriesQuery.data) return 0;
    return entriesQuery.data.reduce(
      (sum, e) => sum + Number(e.amount ?? 0),
      0,
    );
  }, [entriesQuery.data]);

  const handleIncomeSave = () => {
    const value = Number(draftIncome);
    if (!Number.isFinite(value) || value <= 0) {
      setIncomeError("Enter a valid positive amount.");
      return;
    }

    updateBudget.mutate({
      month,
      year,
      income: value,
    });
  };

  const monthLabel = format(today, "MMMM yyyy");

  const allocations = useMemo(() => {
    if (!budgetQuery.data || !categoriesQuery.data) return [];
    const income = incomeNum;

    return budgetQuery.data.allocations
      .map((a) => {
        const cat = categoriesQuery.data!.find((c) => c.id === a.categoryId);
        if (!cat) return null;
        const amount = (income * a.allocationPct) / 100;
        return {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          pct: a.allocationPct,
          amount,
          color: typeColor(cat.type),
        };
      })
      .filter(Boolean) as {
      id: number;
      name: string;
      type: string | null;
      pct: number;
      amount: number;
      color: string;
    }[];
  }, [budgetQuery.data, categoriesQuery.data, incomeNum]);

  const totalAllocated = useMemo(
    () => allocations.reduce((sum, a) => sum + a.amount, 0),
    [allocations],
  );

  const unallocated = Math.max(0, incomeNum - totalAllocated);

  return (
    <main className="px-6 py-10 xl:px-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Greeting */}
        <section className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {firstName}, here&apos;s your month
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              adjust your salary, then watch spending, savings, and investments
              update in real time.
            </p>
          </div>
          <p className="text-xs text-neutral-600">{monthLabel}</p>
        </section>

        {/* Monthly income + budget split */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                monthly income
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {fmt(incomeNum)}
              </p>
            </div>
            {!isEditingIncome && (
              <button
                type="button"
                onClick={() => {
                  setDraftIncome(
                    incomeNum ? String(incomeNum) : draftIncome ?? "",
                  );
                  setIsEditingIncome(true);
                  setIncomeError(null);
                }}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-300 transition hover:border-white/[0.16] hover:text-white"
              >
                edit
              </button>
            )}
          </div>

          {isEditingIncome && (
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 md:min-w-[220px]">
                <span className="mr-2 text-sm text-neutral-500">$</span>
                <input
                  value={draftIncome}
                  onChange={(e) =>
                    setDraftIncome(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="w-full bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:text-neutral-600"
                  placeholder="4100"
                  inputMode="decimal"
                />
              </div>
              <div className="flex gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingIncome(false);
                    setIncomeError(null);
                    setDraftIncome(
                      incomeNum ? String(incomeNum) : draftIncome ?? "",
                    );
                  }}
                  className="rounded-full px-3 py-1.5 text-xs text-neutral-400 transition hover:text-neutral-200"
                >
                  cancel
                </button>
                <button
                  type="button"
                  disabled={updateBudget.isPending}
                  onClick={handleIncomeSave}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-200"
                >
                  {updateBudget.isPending ? "saving…" : "save"}
                </button>
              </div>
            </div>
          )}

          {incomeError && (
            <p className="mt-2 text-xs text-red-400">{incomeError}</p>
          )}

          {/* Budget split preview */}
          {allocations.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>budget split</span>
                <span>
                  {fmt(totalAllocated)} allocated · {fmt(unallocated)} free
                </span>
              </div>

              {/* Segmented bar */}
              <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.05]">
                {allocations.map((a) => (
                  <div
                    key={a.id}
                    className={`h-full rounded-full ${a.color} opacity-80`}
                    style={{ width: `${a.pct}%` }}
                  />
                ))}
              </div>

              {/* Category tiles */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {allocations.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl bg-white/[0.03] p-3.5"
                  >
                    <div className={`mb-2 h-1 w-5 rounded-full ${a.color}`} />
                    <p className="font-mono text-lg font-semibold tabular-nums">
                      {a.pct}%
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {a.name}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-neutral-400">
                      {fmt(a.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Spending summary */}
        <section>
          <SpendingCard
            className=""
            spent={totalSpent}
            limit={spendingAllocation || incomeNum || 1}
          />
        </section>
      </div>
    </main>
  );
}

