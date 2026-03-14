"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { api } from "~/trpc/react";

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Monthly-equivalent cost for a single subscription. */
function monthlyAmount(amount: number, cycle: string) {
  return cycle === "yearly" ? amount / 12 : amount;
}

export function SubscriptionsCard() {
  const query = api.subscription.list.useQuery();
  const subs = useMemo(() => query.data ?? [], [query.data]);
  const activeSubs = useMemo(() => subs.filter((s) => s.isActive), [subs]);

  const totalMonthly = useMemo(
    () =>
      activeSubs.reduce(
        (sum, s) => sum + monthlyAmount(Number(s.amount), s.billingCycle),
        0,
      ),
    [activeSubs],
  );

  const previewEmojis = activeSubs.slice(0, 4).map((s) => s.emoji);

  if (query.isLoading) {
    return (
      <div className="h-36 animate-pulse rounded-2xl bg-indigo-50" />
    );
  }

  // Empty invite state
  if (activeSubs.length === 0) {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-900/5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            🔁 subscriptions
          </p>
        </div>
        <p className="mb-3 text-sm text-green-500">
          track your monthly recurring bills in one place.
        </p>
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
        >
          <Plus size={13} />
          add your first subscription
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/subscriptions"
      className="group block rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-900/5 transition hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
          🔁 subscriptions
        </p>
        <ArrowRight
          size={14}
          className="text-indigo-300 transition group-hover:text-indigo-500"
        />
      </div>

      {/* Total */}
      <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">
        {fmtAUD(totalMonthly)}
        <span className="ml-1 text-base font-normal text-green-400">/mo</span>
      </p>

      {/* Footer row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {previewEmojis.map((emoji, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-sm"
            >
              {emoji}
            </span>
          ))}
          {activeSubs.length > 4 && (
            <span className="ml-0.5 text-xs text-indigo-400">
              +{activeSubs.length - 4}
            </span>
          )}
        </div>
        <p className="text-xs text-green-500">
          {activeSubs.length} subscription{activeSubs.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
