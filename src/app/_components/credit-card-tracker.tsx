"use client";

import { ArrowUpRight, CreditCard } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-green-100 bg-white shadow-sm shadow-green-900/5 ${className}`}>{children}</div>;
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export function CreditCardTracker({
  className, cardName, currentSpend, spendTarget, bonusPoints, daysLeft, paidInFull,
}: {
  className?: string; cardName: string; currentSpend: number; spendTarget: number;
  bonusPoints: number; daysLeft: number; paidInFull: boolean;
}) {
  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-green-500" strokeWidth={1.5} />
          <span className="text-base font-medium text-green-800">card bonus</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-green-600">{cardName}</p>
          <p className="mt-0.5 font-mono text-4xl font-semibold tabular-nums text-green-950">{fmt(currentSpend)}</p>
          <p className="mt-1 text-sm text-green-500">of {fmt(spendTarget)} target</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <ArrowUpRight size={15} className="text-amber-500" />
            <p className="font-mono text-3xl font-semibold tabular-nums text-amber-500">{bonusPoints.toLocaleString()}</p>
          </div>
          <p className="mt-0.5 text-sm text-green-500">bonus points</p>
          <p className="mt-1 text-sm text-green-400">{daysLeft} days left</p>
        </div>
      </div>
      <div className="my-4"><Bar value={currentSpend} total={spendTarget} /></div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${paidInFull ? "bg-green-500" : "bg-green-200"}`} />
        <span className="text-sm text-green-500">paid in full this month</span>
      </div>
    </Card>
  );
}
