"use client";

import { useState } from "react";
import Image from "next/image";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Spoofed data ─────────────────────────────────────────────────────────────

const INCOME = 5500;
const DAY = 10;
const TOTAL_DAYS = 31;
const MONTH_ELAPSED_PCT = (DAY / TOTAL_DAYS) * 100; // 32.3%

const SPENDING_LIMIT = INCOME * 0.4; // $2,200
const SPENDING_SPENT = 620;
const SPENDING_REMAINING = SPENDING_LIMIT - SPENDING_SPENT; // $1,580
const SPENDING_DAYS_LEFT = TOTAL_DAYS - DAY; // 21
const SPENDING_DAILY = SPENDING_REMAINING / SPENDING_DAYS_LEFT; // $75/day
const SPENDING_USED_PCT = (SPENDING_SPENT / SPENDING_LIMIT) * 100; // 28.2%

const SAVINGS_MONTHLY_ALLOC = INCOME * 0.3; // $1,650
const SAVINGS_THIS_MONTH = 660; // 40% — ahead of pace
const SAVINGS_TOTAL = 4280;
const SAVINGS_MONTHLY_PCT = (SAVINGS_THIS_MONTH / SAVINGS_MONTHLY_ALLOC) * 100; // 40%

const INVEST_MONTHLY_ALLOC = INCOME * 0.2; // $1,100
const INVEST_THIS_MONTH = 420;
const INVEST_TOTAL = 8640;
const INVEST_MONTHLY_PCT = (INVEST_THIS_MONTH / INVEST_MONTHLY_ALLOC) * 100; // 38%

const SUBS_TOTAL = 89;
const SUBS = [
  { emoji: "📺", name: "Netflix" },
  { emoji: "🎵", name: "Spotify" },
  { emoji: "☁️", name: "iCloud" },
  { emoji: "🎨", name: "Adobe" },
  { emoji: "💻", name: "GitHub" },
];

const ALLOCATIONS = [
  { emoji: "💸", name: "Spending", pct: 40, amount: INCOME * 0.4, color: "bg-orange-400" },
  { emoji: "💰", name: "Savings",  pct: 30, amount: INCOME * 0.3, color: "bg-green-500" },
  { emoji: "📈", name: "Invest",   pct: 20, amount: INCOME * 0.2, color: "bg-blue-400" },
  { emoji: "✈️", name: "Travel",   pct: 10, amount: INCOME * 0.1, color: "bg-green-300" },
];

// ─── Spending circular progress ───────────────────────────────────────────────

function SpendingRing() {
  const size = 72;
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2; // 52
  const cx = size / 2;
  const circumference = 2 * Math.PI * r; // 326.7

  const spendOffset = circumference - (SPENDING_USED_PCT / 100) * circumference;
  const monthOffset = circumference - (MONTH_ELAPSED_PCT / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-orange-100" />
      {/* Month elapsed ghost ring */}
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={2}
        strokeDasharray={circumference} strokeDashoffset={monthOffset} strokeLinecap="round"
        className="text-orange-300/50 transition-all"
      />
      {/* Spend arc */}
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={spendOffset} strokeLinecap="round"
        className="text-orange-400 transition-all"
      />
    </svg>
  );
}

// ─── Mock Spending Card ───────────────────────────────────────────────────────

function MockSpendingCard() {
  const [view, setView] = useState<"daily" | "monthly">("daily");

  return (
    <div className="overflow-hidden rounded-xl border border-orange-200 bg-linear-to-br from-orange-50 to-white shadow-sm shadow-orange-900/5">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💸</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-orange-400">spending</span>
          </div>
          <span className="text-sm font-medium text-green-400">view all →</span>
        </div>

        {/* Toggle */}
        <div className="mt-3 flex rounded-lg bg-orange-100/60 p-0.5">
          {(["daily", "monthly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 cursor-pointer rounded-md py-1 text-sm font-medium transition-all duration-200 ${
                view === v ? "bg-white text-orange-500 shadow-sm" : "text-green-500 hover:text-green-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex shrink-0 items-center justify-center">
            <SpendingRing />
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-sm font-bold tabular-nums text-orange-500">
                {Math.round(SPENDING_USED_PCT)}%
              </span>
              <span className="text-xs text-orange-300">used</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            {view === "daily" ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-widest text-green-400">today&apos;s allowance</p>
                <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums leading-none text-green-950">
                  {fmt(SPENDING_DAILY)}
                  <span className="ml-0.5 text-sm font-normal text-green-400">/day</span>
                </p>
                <p className="mt-1 text-sm text-green-400">
                  {fmt(SPENDING_REMAINING)} left &middot; {SPENDING_DAYS_LEFT}d to go
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-widest text-green-400">spent this month</p>
                <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums leading-none text-green-950">
                  {fmt(SPENDING_SPENT)}
                </p>
                <p className="mt-1 text-sm text-green-400">of {fmt(SPENDING_LIMIT)} limit</p>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-3 h-px bg-orange-100" />

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-x-3">
          {view === "daily" ? (
            <>
              <div>
                <p className="text-sm text-green-400">spent</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-800">
                  {fmt(SPENDING_SPENT)}
                  <span className="ml-0.5 font-normal text-green-300">/ {fmt(SPENDING_LIMIT)}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-green-400">pace</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-green-600">
                  <span className="inline-block h-1 w-1 rounded-full bg-green-400" />
                  1d ahead
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-green-400">remaining</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-800">
                  {fmt(SPENDING_REMAINING)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-400">budget used</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-green-800">
                  {Math.round(SPENDING_USED_PCT)}%
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mock Budget Card ─────────────────────────────────────────────────────────

function MockBudgetCard() {
  const monthProgressPct = MONTH_ELAPSED_PCT;
  const totalLogged = SPENDING_SPENT + SAVINGS_THIS_MONTH + INVEST_THIS_MONTH; // $1,700
  const remaining = INCOME - totalLogged; // $3,800

  return (
    <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm shadow-green-900/5">
      {/* Month progress bar */}
      <div className="mb-3 h-0.5 w-full overflow-hidden rounded-full bg-green-100">
        <div className="h-full rounded-full bg-green-400" style={{ width: `${monthProgressPct}%` }} />
      </div>

      {/* Income */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold uppercase tracking-widest text-green-400">monthly income</p>
            <span className="rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-sm text-green-600 tabular-nums">
              day {DAY} of {TOTAL_DAYS}
            </span>
          </div>
          <div className="mt-1.5">
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-green-950">
              {fmt(INCOME)}
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-green-500">
              {fmt(remaining)} remaining
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex h-7 cursor-default items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 text-sm text-green-600"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          edit
        </button>
      </div>

      {/* Divider */}
      <div className="my-3 h-px bg-green-100" />

      {/* Budget split */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-green-600">
          <span>budget split</span>
          <span className="tabular-nums">{fmt(INCOME)} allocated · {fmt(0)} free</span>
        </div>

        {/* Segmented bar */}
        <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-green-100">
          {ALLOCATIONS.map((a) => (
            <div key={a.name} className={`h-full rounded-full ${a.color}`} style={{ width: `${a.pct}%` }} />
          ))}
        </div>

        {/* Category tiles */}
        <div className="grid grid-cols-4 gap-2">
          {ALLOCATIONS.map((a) => (
            <div key={a.name} className="rounded-lg bg-green-50 p-2.5">
              <div className={`mb-1.5 h-0.5 w-4 rounded-full ${a.color}`} />
              <p className="font-mono text-base font-semibold tabular-nums text-green-950">{a.pct}%</p>
              <p className="mt-0.5 truncate text-sm text-green-600">
                <span className="mr-0.5">{a.emoji}</span>{a.name}
              </p>
              <p className="mt-0.5 font-mono text-sm tabular-nums text-green-500">{fmt(a.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mock Savings Card ────────────────────────────────────────────────────────

function MockSavingsCard() {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm shadow-green-900/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-sm font-semibold uppercase tracking-widest text-green-500">
            <span className="mr-0.5 text-sm">💰</span>savings
          </span>
        </div>
        <span className="text-sm font-medium text-green-400">view →</span>
      </div>

      <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">{fmt(SAVINGS_TOTAL)}</p>
      <p className="mt-0.5 text-sm text-green-600">
        {fmt(SAVINGS_THIS_MONTH)} this month · of {fmt(SAVINGS_MONTHLY_ALLOC)} allocated
      </p>

      <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-green-100">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${SAVINGS_MONTHLY_PCT}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-green-600">{Math.round(SAVINGS_MONTHLY_PCT)}% of monthly target</span>
          <span className="text-sm text-green-400">
            Emergency Fund <span className="font-mono tabular-nums text-green-600">68%</span>
          </span>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700">
          ahead of pace
        </span>
      </div>
    </div>
  );
}

// ─── Mock Investments Card ────────────────────────────────────────────────────

function MockInvestmentsCard() {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-900/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span className="text-sm font-semibold uppercase tracking-widest text-blue-500">
            <span className="mr-0.5 text-sm">📈</span>investments
          </span>
        </div>
        <span className="text-sm font-medium text-blue-400">view →</span>
      </div>

      <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">{fmt(INVEST_TOTAL)}</p>
      <p className="mt-0.5 text-sm text-green-600">
        {fmt(INVEST_THIS_MONTH)} this month · of {fmt(INVEST_MONTHLY_ALLOC)} allocated
      </p>

      <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${INVEST_MONTHLY_PCT}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-green-600">{Math.round(INVEST_MONTHLY_PCT)}% of monthly target</span>
          <span className="text-sm text-blue-400">
            VDHG Portfolio <span className="font-mono tabular-nums text-blue-600">72%</span>
          </span>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-sm font-medium text-blue-600">
          on track
        </span>
      </div>
    </div>
  );
}

// ─── Mock Subscriptions Card ──────────────────────────────────────────────────

function MockSubscriptionsCard() {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm shadow-indigo-900/5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">🔁 subscriptions</p>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>

      <p className="font-mono text-2xl font-semibold tabular-nums text-green-950">
        {fmt(SUBS_TOTAL)}
        <span className="ml-0.5 text-sm font-normal text-green-400">/mo</span>
      </p>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {SUBS.slice(0, 4).map((s) => (
            <span key={s.name} className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-sm">
              {s.emoji}
            </span>
          ))}
          <span className="ml-0.5 text-sm text-indigo-400">+1</span>
        </div>
        <p className="text-sm text-green-500">{SUBS.length} subscriptions</p>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function MockDashboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-green-200/70 bg-white shadow-2xl shadow-green-900/10">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-green-100 bg-white/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Image src="/budgie_1.png" alt="budgie" width={24} height={24} className="rounded-md shadow-sm shadow-green-900/10" />
            <span className="text-base font-semibold tracking-tight text-green-950">budgie</span>
          </div>
          {/* Mock user avatar */}
          <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-green-200 ring-2 ring-green-300/50">
            <span className="text-sm font-semibold text-green-700">AC</span>
          </div>
        </div>
      </header>

      {/* ── Dashboard content ── */}
      <div className="px-4 py-5">
        <div className="mx-auto max-w-full space-y-5">

          {/* Greeting */}
          <section className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-green-400">good morning</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-green-950">
                Alex, here&apos;s your month
              </h1>
              <p className="mt-0.5 text-sm text-green-600">
                You&apos;re {Math.round(MONTH_ELAPSED_PCT)}% through March and {Math.round(SPENDING_USED_PCT)}% through your spending budget — right on pace.
              </p>
            </div>
            <div className="flex items-end gap-2 md:flex-col md:items-end">
              <p className="text-sm text-green-600">March 2026</p>
              <div className="flex flex-col items-end gap-0.5">
                <p className="text-sm text-green-400 tabular-nums">day {DAY} of {TOTAL_DAYS}</p>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-green-200">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${MONTH_ELAPSED_PCT}%` }} />
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-sm font-medium text-green-600">
                payday in 5 days
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-sm font-medium text-green-600">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                view history
              </span>
            </div>
          </section>

          {/* Budget + Spending */}
          <section className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <MockBudgetCard />
            <MockSpendingCard />
          </section>

          {/* Savings + Investments */}
          <section className="grid gap-3 md:grid-cols-2">
            <MockSavingsCard />
            <MockInvestmentsCard />
          </section>

          {/* Subscriptions */}
          <MockSubscriptionsCard />
        </div>
      </div>
    </div>
  );
}
