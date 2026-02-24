import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Plane,
  CreditCard,
  ChevronRight,
  Settings,
} from "lucide-react";

import { auth } from "~/server/auth";

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK = {
  month: "February 2025",
  income: 4100,
  spendingPct: 30,
  savingsPct: 40,
  investPct: 20,
  travelPct: 10,

  spending: { spent: 843.5, limit: 1230 },

  savings: {
    name: "Emergency Fund",
    current: 7240,
    target: 12000,
    streak: 4,
    grewByHundred: true,
  },

  investment: {
    contribution: 820,
    portfolioValue: 14350,
    prevPortfolioValue: 13100,
  },

  travel: {
    name: "Japan Trip",
    current: 1800,
    target: 5000,
    monthlyContribution: 410,
  },

  creditCard: {
    cardName: "NAB Qantas Signature",
    currentSpend: 2340,
    spendTarget: 5000,
    bonusPoints: 120000,
    daysLeft: 61,
    paidInFull: true,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(value: number, total: number) {
  return Math.min(100, Math.round((value / total) * 100));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-[#141414] p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function ProgressBar({
  value,
  total,
  color = "bg-white",
}: {
  value: number;
  total: number;
  color?: string;
}) {
  const fill = pct(value, total);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-neutral-500" strokeWidth={1.5} />
        <span className="text-sm font-medium text-neutral-300">{label}</span>
      </div>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-xs text-neutral-600 transition hover:text-neutral-400"
      >
        details <ChevronRight size={12} />
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = session.user;

  const { income, spendingPct, savingsPct, investPct, travelPct } = MOCK;
  const spendLimit = (income * spendingPct) / 100;
  const savingsAlloc = (income * savingsPct) / 100;
  const investAlloc = (income * investPct) / 100;
  const travelAlloc = (income * travelPct) / 100;

  const portfolioDelta =
    MOCK.investment.portfolioValue - MOCK.investment.prevPortfolioValue;
  const portfolioDeltaPct = (
    (portfolioDelta / MOCK.investment.prevPortfolioValue) *
    100
  ).toFixed(1);
  const monthsToGoal =
    MOCK.travel.monthlyContribution > 0
      ? Math.ceil(
          (MOCK.travel.target - MOCK.travel.current) /
            MOCK.travel.monthlyContribution,
        )
      : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-white">
            budgetr
          </span>
          <div className="flex items-center gap-3">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "avatar"}
                width={26}
                height={26}
                className="rounded-full opacity-90"
              />
            )}
            <Link
              href="/settings"
              className="text-neutral-600 transition hover:text-neutral-400"
            >
              <Settings size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] space-y-4 px-6 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            hey, {user.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{MOCK.month}</p>
        </div>

        {/* ── Monthly Overview ── */}
        <Card>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500">monthly income</p>
              <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums tracking-tight">
                {fmt(income)}
              </p>
            </div>
            <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-neutral-400">
              {MOCK.month}
            </span>
          </div>

          {/* 4-way split */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "spending", pct: spendingPct, amount: spendLimit, color: "bg-orange-400" },
              { label: "savings", pct: savingsPct, amount: savingsAlloc, color: "bg-emerald-400" },
              { label: "invest", pct: investPct, amount: investAlloc, color: "bg-blue-400" },
              { label: "travel", pct: travelPct, amount: travelAlloc, color: "bg-violet-400" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-white/[0.04] p-3"
              >
                <div className={`mb-2 h-1.5 w-6 rounded-full ${item.color}`} />
                <p className="font-mono text-base font-medium tabular-nums">
                  {item.pct}%
                </p>
                <p className="text-xs text-neutral-500">{item.label}</p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-neutral-400">
                  {fmt(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Spending ── */}
        <Card>
          <SectionHeader icon={Wallet} label="spending" href="/spending" />
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {fmt(MOCK.spending.spent)}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                of {fmt(MOCK.spending.limit)} limit
              </p>
            </div>
            <p
              className={`text-sm font-medium tabular-nums ${
                pct(MOCK.spending.spent, MOCK.spending.limit) > 90
                  ? "text-red-400"
                  : pct(MOCK.spending.spent, MOCK.spending.limit) > 70
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            >
              {fmt(MOCK.spending.limit - MOCK.spending.spent)} left
            </p>
          </div>
          <ProgressBar
            value={MOCK.spending.spent}
            total={MOCK.spending.limit}
            color={
              pct(MOCK.spending.spent, MOCK.spending.limit) > 90
                ? "bg-red-400"
                : pct(MOCK.spending.spent, MOCK.spending.limit) > 70
                  ? "bg-amber-400"
                  : "bg-orange-400"
            }
          />
          <p className="mt-2 text-right text-xs text-neutral-600">
            {pct(MOCK.spending.spent, MOCK.spending.limit)}% used
          </p>
        </Card>

        {/* ── Savings ── */}
        <Card>
          <SectionHeader icon={PiggyBank} label="savings" href="/savings" />
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-500">{MOCK.savings.name}</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
                {fmt(MOCK.savings.current)}
              </p>
              <p className="text-xs text-neutral-500">
                of {fmt(MOCK.savings.target)} goal
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">monthly allocation</p>
              <p className="font-mono text-sm tabular-nums text-neutral-300">
                {fmt(savingsAlloc)}
              </p>
            </div>
          </div>
          <ProgressBar
            value={MOCK.savings.current}
            total={MOCK.savings.target}
            color="bg-emerald-400"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-500">streak</span>
              <span className="font-mono text-xs font-medium text-emerald-400">
                {MOCK.savings.streak} months 🔥
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${MOCK.savings.grewByHundred ? "bg-emerald-400" : "bg-neutral-700"}`}
              />
              <span className="text-xs text-neutral-500">
                ANZ +$100 qualifier
              </span>
            </div>
          </div>
        </Card>

        {/* ── Investments ── */}
        <Card>
          <SectionHeader
            icon={TrendingUp}
            label="investments"
            href="/investments"
          />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500">this month</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
                {fmt(MOCK.investment.contribution)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">portfolio value</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
                {fmt(MOCK.investment.portfolioValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">month change</p>
              <p
                className={`mt-0.5 font-mono text-xl font-semibold tabular-nums ${
                  portfolioDelta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {portfolioDelta >= 0 ? "+" : ""}
                {portfolioDeltaPct}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={MOCK.investment.contribution}
              total={investAlloc}
              color="bg-blue-400"
            />
            <p className="mt-2 text-xs text-neutral-600">
              {fmt(MOCK.investment.contribution)} of {fmt(investAlloc)} allocated
            </p>
          </div>
        </Card>

        {/* ── Travel Fund ── */}
        <Card>
          <SectionHeader icon={Plane} label="travel" href="/travel" />
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-500">{MOCK.travel.name}</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
                {fmt(MOCK.travel.current)}
              </p>
              <p className="text-xs text-neutral-500">
                of {fmt(MOCK.travel.target)} goal
              </p>
            </div>
            {monthsToGoal !== null && (
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold tabular-nums text-violet-400">
                  {monthsToGoal}
                </p>
                <p className="text-xs text-neutral-500">months to go</p>
              </div>
            )}
          </div>
          <ProgressBar
            value={MOCK.travel.current}
            total={MOCK.travel.target}
            color="bg-violet-400"
          />
          <p className="mt-2 text-xs text-neutral-600">
            {pct(MOCK.travel.current, MOCK.travel.target)}% saved ·{" "}
            {fmt(MOCK.travel.monthlyContribution)}/mo contribution
          </p>
        </Card>

        {/* ── Credit Card Bonus ── */}
        <Card>
          <SectionHeader
            icon={CreditCard}
            label="credit card bonus"
            href="/credit-card"
          />
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500">
                {MOCK.creditCard.cardName}
              </p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
                {fmt(MOCK.creditCard.currentSpend)}
              </p>
              <p className="text-xs text-neutral-500">
                of {fmt(MOCK.creditCard.spendTarget)} target
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-semibold tabular-nums text-amber-400">
                {MOCK.creditCard.bonusPoints.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">bonus pts</p>
              <p className="mt-1 text-xs text-neutral-600">
                {MOCK.creditCard.daysLeft}d left
              </p>
            </div>
          </div>
          <ProgressBar
            value={MOCK.creditCard.currentSpend}
            total={MOCK.creditCard.spendTarget}
            color="bg-amber-400"
          />
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${MOCK.creditCard.paidInFull ? "bg-emerald-400" : "bg-neutral-700"}`}
            />
            <span className="text-xs text-neutral-500">paid in full</span>
          </div>
        </Card>

        {/* Bottom padding */}
        <div className="h-8" />
      </main>
    </div>
  );
}
