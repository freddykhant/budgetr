"use client";

import { useMemo } from "react";
import { format } from "date-fns";

import { api } from "~/trpc/react";
import { MonthlyBudgetCard } from "./monthly-budget-card";
import { SpendingCard } from "./spending-card";

type DashboardClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};


export function DashboardClient({ user }: DashboardClientProps) {
  const firstName = user.name?.split(" ")[0] ?? "hey";
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Budget + categories
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const categoriesQuery = api.category.list.useQuery();

  const incomeNum = useMemo(
    () => Number(budgetQuery.data?.income ?? 0),
    [budgetQuery.data],
  );

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

  const monthLabel = format(today, "MMMM yyyy");

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
        <section>
          <MonthlyBudgetCard month={month} year={year} />
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

