"use client";

import { PiggyBank } from "lucide-react";

function Bar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-green-100">
      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-green-100 bg-white shadow-sm shadow-green-900/5 ${className}`}>{children}</div>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export function SavingCard({
  className, name, current, target, streak, grewByHundred,
}: {
  className?: string; name: string; current: number; target: number; streak: number; grewByHundred: boolean;
}) {
  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={15} className="text-green-500" strokeWidth={1.5} />
          <span className="text-base font-medium text-green-800">savings</span>
        </div>
      </div>
      <p className="text-sm text-green-600">{name}</p>
      <p className="mt-0.5 font-mono text-4xl font-semibold tabular-nums text-green-950">{fmt(current)}</p>
      <p className="mt-1 text-sm text-green-500">of {fmt(target)}</p>
      <div className="my-4"><Bar value={current} total={target} /></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${grewByHundred ? "bg-green-500" : "bg-green-200"}`} />
          <span className="text-sm text-green-500">ANZ qualifier</span>
        </div>
        <span className="text-sm font-medium text-green-600">{streak}mo streak 🔥</span>
      </div>
    </Card>
  );
}
