"use client";

import { useMemo } from "react";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { api } from "~/trpc/react";
import { type creditCardTrackers } from "~/server/db/schema";

type Tracker = typeof creditCardTrackers.$inferSelect;

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CreditCardSection() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const categoriesQuery = api.category.list.useQuery();
  const trackersQuery = api.creditCard.list.useQuery();

  const creditCategories = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter((c) => c.type === "credit_card"),
    [categoriesQuery.data],
  );

  const categoryIds = creditCategories.map((c) => c.id);

  const allEntriesQuery = api.entry.listForCategories.useQuery(
    { categoryIds },
    { enabled: categoryIds.length > 0 },
  );

  const trackersData = trackersQuery.data;
  const trackersByCat = useMemo(() => {
    const result: Record<number, Tracker | undefined> = {};
    (trackersData ?? []).forEach((t: Tracker) => {
      result[t.categoryId] = t;
    });
    return result;
  }, [trackersData]);

  const allEntries = useMemo(
    () => allEntriesQuery.data ?? [],
    [allEntriesQuery.data],
  );

  if (creditCategories.length === 0) return null;

  const isLoading =
    categoriesQuery.isLoading ||
    trackersQuery.isLoading ||
    allEntriesQuery.isLoading;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-neutral-600">
          <span className="text-sm">💳</span>
          <span>credit cards</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creditCategories.map((cat) => {
          const tracker = trackersByCat[cat.id];
          const catEntries = allEntries.filter(
            (e) =>
              e.categoryId === cat.id &&
              tracker &&
              e.date >= tracker.startDate &&
              e.date <= tracker.endDate,
          );
          const totalSpent = catEntries.reduce(
            (s, e) => s + Number(e.amount),
            0,
          );
          const spendTarget = tracker ? Number(tracker.spendTarget) : 0;
          const spendPct =
            spendTarget > 0
              ? Math.min(100, (totalSpent / spendTarget) * 100)
              : 0;
          const isComplete = spendTarget > 0 && totalSpent >= spendTarget;
          const isPastEnd =
            tracker ? todayStr > tracker.endDate : false;
          const daysLeft = tracker
            ? Math.max(
                0,
                differenceInCalendarDays(parseISO(tracker.endDate), today),
              )
            : 0;

          const barColor = isComplete
            ? "bg-emerald-400"
            : isPastEnd
              ? "bg-neutral-600"
              : "bg-amber-400";

          return (
            <Link
              key={cat.id}
              href={`/credit/${cat.id}`}
              className="group rounded-2xl border border-white/[0.06] bg-[#111111] p-5 transition hover:border-white/[0.10] hover:bg-[#161616]"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {cat.emoji && (
                    <span className="text-base">{cat.emoji}</span>
                  )}
                  <span className="text-sm font-medium text-neutral-200">
                    {cat.name}
                  </span>
                </div>
                <ArrowRight
                  size={13}
                  className="mt-0.5 text-neutral-700 transition group-hover:text-neutral-400"
                />
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="h-6 w-20 animate-pulse rounded-md bg-white/[0.05]" />
                  <div className="h-1 w-full animate-pulse rounded-full bg-white/[0.05]" />
                </div>
              )}

              {!isLoading && !tracker && (
                <p className="text-xs text-neutral-700">
                  no tracker set up — tap to configure
                </p>
              )}

              {!isLoading && tracker && (
                <>
                  {/* Bonus points */}
                  {tracker.bonusPoints > 0 && (
                    <p className="mb-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
                      {tracker.bonusPoints.toLocaleString()} pts
                    </p>
                  )}

                  {/* Spend progress */}
                  <p className="font-mono text-sm tabular-nums text-neutral-200">
                    {fmt(totalSpent)}{" "}
                    <span className="text-neutral-600">
                      / {fmt(spendTarget)}
                    </span>
                  </p>

                  <div className="my-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${spendPct}%` }}
                    />
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs tabular-nums text-neutral-600">
                      {isComplete
                        ? "bonus earned 🎉"
                        : isPastEnd
                          ? "window closed"
                          : `${daysLeft}d left`}
                    </p>
                    {tracker.paidInFull && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 size={11} />
                        <span>paid</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
