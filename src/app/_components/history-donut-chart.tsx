"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { EmptyState } from "./empty-state";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
  emoji: string | null;
  type: string | null;
};

type SummaryRow = { categoryId: number; total: string | null };

// ─── Colour palette for spending slices ───────────────────────────────────────

const PALETTE = [
  "#f97316",
  "#fb923c",
  "#fdba74",
  "#fcd34d",
  "#fbbf24",
  "#f59e0b",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  return (
    <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-green-950">{item.name}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-green-700">
        {fmt(item.value)}
      </p>
      <p className="text-xs text-green-400">{item.payload.pct}% of total</p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-[200px] w-[200px] items-center justify-center">
        <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-green-100" />
        <div className="absolute h-[110px] w-[110px] rounded-full bg-white" />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[60, 80, 50].map((w, i) => (
          <div key={i} className={`h-7 animate-pulse rounded-full bg-green-100`} style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryDonutChart({
  summaryData,
  categories,
  isLoading,
}: {
  summaryData: SummaryRow[];
  categories: Category[];
  isLoading: boolean;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Only spending categories
  const slices = summaryData
    .filter((r) => {
      const cat = catById.get(r.categoryId);
      return cat?.type === "spending" && Number(r.total ?? 0) > 0;
    })
    .map((r, i) => {
      const cat = catById.get(r.categoryId)!;
      return {
        id: r.categoryId,
        name: `${cat.emoji ?? ""} ${cat.name}`,
        value: Number(r.total ?? 0),
        color: PALETTE[i % PALETTE.length]!,
      };
    });

  const total = slices.reduce((s, d) => s + d.value, 0);

  const slicesWithPct = slices.map((s) => ({
    ...s,
    pct: total > 0 ? Math.round((s.value / total) * 100) : 0,
  }));

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-orange-400">
        spending breakdown
      </p>

      {isLoading ? (
        <DonutSkeleton />
      ) : slices.length === 0 ? (
        <EmptyState
          mascotSize={40}
          animate="bob"
          headline="no spending logged"
          body="spending entries will appear here once logged."
        />
      ) : (
        <>
          {/* Ring chart with center label */}
          <div className="relative flex justify-center">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={slicesWithPct}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {slicesWithPct.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-mono text-2xl font-semibold tabular-nums text-green-950">
                {fmt(total)}
              </p>
              <p className="text-xs text-green-400">total spent</p>
            </div>
          </div>

          {/* Legend pills */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {slicesWithPct.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs text-orange-700"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name} · {fmt(s.value)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
