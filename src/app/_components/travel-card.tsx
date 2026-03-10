"use client";

import { Plane } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-green-100 bg-white shadow-sm shadow-green-900/5 ${className}`}>{children}</div>;
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
      <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export function TravelCard({
  className, name, current, target, monthlyContribution, monthsToGoal,
}: {
  className?: string; name: string; current: number; target: number;
  monthlyContribution: number; monthsToGoal: number | null;
}) {
  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane size={15} className="text-green-500" strokeWidth={1.5} />
          <span className="text-base font-medium text-green-800">travel</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-green-600">{name}</p>
          <p className="mt-0.5 font-mono text-4xl font-semibold tabular-nums text-green-950">{fmt(current)}</p>
          <p className="mt-1 text-sm text-green-500">of {fmt(target)} goal</p>
        </div>
        {monthsToGoal !== null && (
          <div className="text-right">
            <p className="font-mono text-5xl font-semibold tabular-nums text-violet-500">{monthsToGoal}</p>
            <p className="mt-0.5 text-sm text-green-500">months to go</p>
          </div>
        )}
      </div>
      <div className="my-4"><Bar value={current} total={target} /></div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-green-500">{Math.min(100, Math.round((current / target) * 100))}% saved</span>
        <span className="text-sm text-green-500">{fmt(monthlyContribution)}/mo</span>
      </div>
    </Card>
  );
}
