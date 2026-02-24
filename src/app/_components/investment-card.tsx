"use client";

import { TrendingUp } from "lucide-react";

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-[#111111] ${className}`}
    >
      {children}
    </div>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full rounded-full bg-blue-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      <p
        className={`font-mono text-xl font-semibold tabular-nums leading-none ${
          accent ?? "text-[#EDEDED]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-neutral-600">{sub}</p>}
    </div>
  );
}

export function InvestmentCard({
  className,
  contribution,
  allocation,
  portfolioValue,
  previousValue,
}: {
  className?: string;
  contribution: number;
  allocation: number;
  portfolioValue: number;
  previousValue: number;
}) {
  const delta = portfolioValue - previousValue;
  const deltaPct =
    previousValue > 0 ? ((delta / previousValue) * 100).toFixed(1) : "0.0";

  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp
            size={14}
            className="text-neutral-500"
            strokeWidth={1.5}
          />
          <span className="text-sm font-medium">investments</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Stat
          label="contributed"
          value={fmt(contribution)}
          sub={`of ${fmt(allocation)} alloc.`}
        />
        <Stat
          label="portfolio"
          value={fmt(portfolioValue)}
          sub={`${delta >= 0 ? "+" : ""}${deltaPct}% this month`}
          accent={delta >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>
      <div className="mt-4">
        <Bar value={contribution} total={allocation} />
      </div>
    </Card>
  );
}

