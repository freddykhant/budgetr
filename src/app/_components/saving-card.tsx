"use client";

import { PiggyBank } from "lucide-react";

function Bar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full rounded-full bg-emerald-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

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

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SavingCard({
  className,
  name,
  current,
  target,
  streak,
  grewByHundred,
}: {
  className?: string;
  name: string;
  current: number;
  target: number;
  streak: number;
  grewByHundred: boolean;
}) {
  return (
    <Card className={className ?? ""}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={14} className="text-neutral-500" strokeWidth={1.5} />
          <span className="text-sm font-medium">savings</span>
        </div>
      </div>
      <p className="text-xs text-neutral-500">{name}</p>
      <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums">
        {fmt(current)}
      </p>
      <p className="mt-1 text-xs text-neutral-500">of {fmt(target)}</p>
      <div className="my-4">
        <Bar value={current} total={target} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              grewByHundred ? "bg-emerald-400" : "bg-neutral-700"
            }`}
          />
          <span className="text-xs text-neutral-600">ANZ qualifier</span>
        </div>
        <span className="text-xs font-medium text-emerald-400">
          {streak}mo streak 🔥
        </span>
      </div>
    </Card>
  );
}

