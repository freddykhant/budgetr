import { useMemo } from "react";
import { format, getDaysInMonth } from "date-fns";

import { api } from "~/trpc/react";
import { CreditCardSection } from "./credit-card-section";
import { CustomCategoriesSection } from "./custom-categories-section";
import { InvestmentsCard } from "./investments-card";
import { MonthlyBudgetCard } from "./monthly-budget-card";
import { SavingsCard } from "./savings-card";
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
  const monthName = format(today, "MMMM");
  const dayOfMonth = today.getDate();
  const totalDaysInMonth = getDaysInMonth(today);
  const monthElapsedPct =
    totalDaysInMonth > 0 ? (dayOfMonth / totalDaysInMonth) * 100 : 0;
  const daysLeft = Math.max(0, totalDaysInMonth - dayOfMonth);

  const hour = today.getHours();
  const greeting =
    hour < 12 ? "good morning" : hour < 18 ? "good afternoon" : "good evening";

  const hasSpendingBudget = spendingAllocation > 0 && !!spendingCategory;
  const spendUsedPct = hasSpendingBudget
    ? Math.min(100, Math.round((totalSpent / spendingAllocation) * 100))
    : 0;
  const monthPctRounded = Math.round(monthElapsedPct);

  let pulse: string;
  if (!hasSpendingBudget) {
    pulse =
      "Set up your spending allocation to see how you're tracking this month.";
  } else if (spendUsedPct === 0) {
    pulse =
      "You haven't spent from your monthly budget yet — a clean slate for the month.";
  } else if (Math.abs(spendUsedPct - monthPctRounded) <= 5) {
    pulse = `You're ${monthPctRounded}% through ${monthName} and ${spendUsedPct}% through your spending budget — right on pace.`;
  } else if (spendUsedPct > monthPctRounded) {
    pulse = `Heads up — you've used ${spendUsedPct}% of your spending budget with ${daysLeft} day${
      daysLeft === 1 ? "" : "s"
    } left.`;
  } else {
    pulse = "Nice — you're ahead of pace on spending this month.";
  }

  return (
    <main className="px-6 py-10 xl:px-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Greeting */}
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              {greeting}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
              {firstName}, here&apos;s your month
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{pulse}</p>
          </div>
          <div className="flex items-end gap-3 md:flex-col md:items-end">
            <p className="text-xs text-neutral-600">{monthLabel}</p>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[11px] text-neutral-600 tabular-nums">
                day {dayOfMonth} of {totalDaysInMonth}
              </p>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-white/70 transition-all duration-500"
                  style={{ width: `${monthElapsedPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Monthly income + budget split + spending summary */}
        <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <MonthlyBudgetCard month={month} year={year} />
          </div>
          <div>
            <SpendingCard
              spent={totalSpent}
              limit={spendingAllocation || incomeNum || 1}
            />
          </div>
        </section>

        {/* Savings · Investments */}
        <section className="grid gap-4 md:grid-cols-2">
          <SavingsCard />
          <InvestmentsCard />
        </section>

        {/* Credit cards (only renders if user has any) */}
        <CreditCardSection />

        {/* Custom categories (only renders if user has any) */}
        <CustomCategoriesSection />
      </div>
    </main>
  );
}

