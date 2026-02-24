import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userSettings } from "~/server/db/schema";
import { Header } from "~/app/_components/header";
import { DashboardClient } from "~/app/_components/dashboard-client";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      <Header user={session.user} />
      <DashboardClient user={session.user} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Plane,
  CreditCard,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

import { auth } from "~/server/auth";
import { Header } from "~/app/_components/header";

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK = {
  month: "February 2025",
  income: 4100,
  spendingPct: 30,
  savingsPct: 40,
  investPct: 20,
  travelPct: 10,
  spending: { spent: 843.5, limit: 1230 },
  savings: { name: "Emergency Fund", current: 7240, target: 12000, streak: 4, grewByHundred: true },
  investment: { contribution: 820, portfolioValue: 14350, prevPortfolioValue: 13100 },
  travel: { name: "Japan Trip", current: 1800, target: 5000, monthlyContribution: 410 },
  creditCard: { cardName: "NAB Qantas Signature", currentSpend: 2340, spendTarget: 5000, bonusPoints: 120000, daysLeft: 61, paidInFull: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function pct(value: number, total: number) {
  return Math.min(100, Math.round((value / total) * 100));
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#111111] ${className}`}>
      {children}
    </div>
  );
}

function Bar({ value, total, color = "bg-white" }: { value: number; total: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct(value, total)}%` }} />
    </div>
  );
}

function CardLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs text-neutral-600 transition hover:text-neutral-300">
      {label ?? "view"} <ChevronRight size={11} />
    </Link>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      <p className={`font-mono text-xl font-semibold tabular-nums leading-none ${accent ?? "text-[#EDEDED]"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user;

  const { income, spendingPct, savingsPct, investPct, travelPct } = MOCK;
  const spendLimit   = (income * spendingPct) / 100;
  const savingsAlloc = (income * savingsPct)  / 100;
  const investAlloc  = (income * investPct)   / 100;
  const travelAlloc  = (income * travelPct)   / 100;

  const totalAllocated = spendLimit + savingsAlloc + investAlloc + travelAlloc;
  const portfolioDelta    = MOCK.investment.portfolioValue - MOCK.investment.prevPortfolioValue;
  const portfolioDeltaPct = ((portfolioDelta / MOCK.investment.prevPortfolioValue) * 100).toFixed(1);
  const monthsToGoal = MOCK.travel.monthlyContribution > 0
    ? Math.ceil((MOCK.travel.target - MOCK.travel.current) / MOCK.travel.monthlyContribution)
    : null;

  const spendingFill = pct(MOCK.spending.spent, spendLimit);

  const splits = [
    { label: "spending", pct: spendingPct, amount: spendLimit,   color: "bg-orange-400",  bar: "bg-orange-400" },
    { label: "savings",  pct: savingsPct,  amount: savingsAlloc, color: "bg-emerald-400", bar: "bg-emerald-400" },
    { label: "invest",   pct: investPct,   amount: investAlloc,  color: "bg-blue-400",    bar: "bg-blue-400" },
    { label: "travel",   pct: travelPct,   amount: travelAlloc,  color: "bg-violet-400",  bar: "bg-violet-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      <Header user={user} />

      <main className="px-6 py-8 xl:px-12">
        {/* ── Greeting ── */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {user.name?.split(" ")[0] ?? "hey"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{MOCK.month}</p>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-neutral-400">
            {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>

        {/* ── Bento grid ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ── Overview (large, left) ── */}
          <Card className="lg:col-span-7 p-7">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs text-neutral-500">monthly income</p>
                <p className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight">
                  {fmt(income)}
                </p>
              </div>
              <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-neutral-500">
                budget split
              </span>
            </div>

            {/* Segmented bar */}
            <div className="mb-5 flex h-2 w-full overflow-hidden rounded-full gap-0.5">
              {splits.map((s) => (
                <div
                  key={s.label}
                  className={`h-full rounded-full ${s.bar} opacity-80`}
                  style={{ width: `${s.pct}%` }}
                />
              ))}
            </div>

            {/* Split breakdown */}
            <div className="grid grid-cols-4 gap-3">
              {splits.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.03] p-3.5">
                  <div className={`mb-2.5 h-1 w-5 rounded-full ${s.color}`} />
                  <p className="font-mono text-lg font-semibold tabular-nums">{s.pct}%</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{s.label}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-neutral-400">{fmt(s.amount)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Summary panel (right) ── */}
          <Card className="lg:col-span-5 flex flex-col justify-between p-7">
            <p className="mb-5 text-xs text-neutral-500 uppercase tracking-widest">this month</p>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500">total allocated</p>
                  <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">{fmt(totalAllocated)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500">unallocated</p>
                  <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-neutral-400">
                    {fmt(income - totalAllocated)}
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/[0.05]" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500">spent so far</p>
                  <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                    {fmt(MOCK.spending.spent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">spend remaining</p>
                  <p className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${spendingFill > 90 ? "text-red-400" : spendingFill > 70 ? "text-amber-400" : "text-emerald-400"}`}>
                    {fmt(spendLimit - MOCK.spending.spent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">savings streak</p>
                  <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-emerald-400">
                    {MOCK.savings.streak} months 🔥
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">portfolio</p>
                  <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                    {fmt(MOCK.investment.portfolioValue)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Spending ── */}
          <Card className="lg:col-span-4 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-neutral-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">spending</span>
              </div>
              <CardLink href="/spending" />
            </div>
            <p className="font-mono text-3xl font-semibold tabular-nums">{fmt(MOCK.spending.spent)}</p>
            <p className="mt-1 text-xs text-neutral-500">of {fmt(spendLimit)} limit</p>
            <div className="my-4">
              <Bar
                value={MOCK.spending.spent}
                total={spendLimit}
                color={spendingFill > 90 ? "bg-red-400" : spendingFill > 70 ? "bg-amber-400" : "bg-orange-400"}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">{spendingFill}% used</span>
              <span className={`text-xs font-medium tabular-nums ${spendingFill > 90 ? "text-red-400" : spendingFill > 70 ? "text-amber-400" : "text-emerald-400"}`}>
                {fmt(spendLimit - MOCK.spending.spent)} left
              </span>
            </div>
          </Card>

          {/* ── Savings ── */}
          <Card className="lg:col-span-4 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-neutral-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">savings</span>
              </div>
              <CardLink href="/savings" />
            </div>
            <p className="text-xs text-neutral-500">{MOCK.savings.name}</p>
            <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums">{fmt(MOCK.savings.current)}</p>
            <p className="mt-1 text-xs text-neutral-500">of {fmt(MOCK.savings.target)}</p>
            <div className="my-4">
              <Bar value={MOCK.savings.current} total={MOCK.savings.target} color="bg-emerald-400" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${MOCK.savings.grewByHundred ? "bg-emerald-400" : "bg-neutral-700"}`} />
                <span className="text-xs text-neutral-600">ANZ qualifier</span>
              </div>
              <span className="text-xs font-medium text-emerald-400">{MOCK.savings.streak}mo streak 🔥</span>
            </div>
          </Card>

          {/* ── Investments ── */}
          <Card className="lg:col-span-4 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-neutral-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">investments</span>
              </div>
              <CardLink href="/investments" />
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-3">
              <Stat label="contributed" value={fmt(MOCK.investment.contribution)} sub={`of ${fmt(investAlloc)} alloc.`} />
              <Stat
                label="portfolio"
                value={fmt(MOCK.investment.portfolioValue)}
                sub={`${portfolioDelta >= 0 ? "+" : ""}${portfolioDeltaPct}% this month`}
                accent={portfolioDelta >= 0 ? "text-emerald-400" : "text-red-400"}
              />
            </div>
            <div className="mt-4">
              <Bar value={MOCK.investment.contribution} total={investAlloc} color="bg-blue-400" />
            </div>
          </Card>

          {/* ── Travel ── */}
          <Card className="lg:col-span-6 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane size={14} className="text-neutral-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">travel</span>
              </div>
              <CardLink href="/travel" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-neutral-500">{MOCK.travel.name}</p>
                <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums">{fmt(MOCK.travel.current)}</p>
                <p className="mt-1 text-xs text-neutral-500">of {fmt(MOCK.travel.target)} goal</p>
              </div>
              {monthsToGoal !== null && (
                <div className="text-right">
                  <p className="font-mono text-4xl font-semibold tabular-nums text-violet-400">{monthsToGoal}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">months to go</p>
                </div>
              )}
            </div>
            <div className="my-4">
              <Bar value={MOCK.travel.current} total={MOCK.travel.target} color="bg-violet-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-600">{pct(MOCK.travel.current, MOCK.travel.target)}% saved</span>
              <span className="text-xs text-neutral-600">{fmt(MOCK.travel.monthlyContribution)}/mo</span>
            </div>
          </Card>

          {/* ── Credit Card ── */}
          <Card className="lg:col-span-6 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-neutral-500" strokeWidth={1.5} />
                <span className="text-sm font-medium">card bonus</span>
              </div>
              <CardLink href="/credit-card" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-neutral-500">{MOCK.creditCard.cardName}</p>
                <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums">{fmt(MOCK.creditCard.currentSpend)}</p>
                <p className="mt-1 text-xs text-neutral-500">of {fmt(MOCK.creditCard.spendTarget)} target</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <ArrowUpRight size={14} className="text-amber-400" />
                  <p className="font-mono text-2xl font-semibold tabular-nums text-amber-400">
                    {MOCK.creditCard.bonusPoints.toLocaleString()}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">bonus points</p>
                <p className="mt-1 text-xs text-neutral-600">{MOCK.creditCard.daysLeft} days left</p>
              </div>
            </div>
            <div className="my-4">
              <Bar value={MOCK.creditCard.currentSpend} total={MOCK.creditCard.spendTarget} color="bg-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${MOCK.creditCard.paidInFull ? "bg-emerald-400" : "bg-neutral-700"}`} />
              <span className="text-xs text-neutral-600">paid in full this month</span>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
