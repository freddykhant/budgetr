"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
  emoji: string | null;
  type: string | null;
};

type BudgetWithAllocations = {
  income: string | number;
  allocations: { categoryId: number; allocationPct: number }[];
};

type SummaryRow = { categoryId: number; total: string | null };

// ─── Accent colours per category type ─────────────────────────────────────────

const accentByType: Record<string, { solid: string; light: string }> = {
  spending: { solid: "#f97316", light: "#fed7aa" },
  saving: { solid: "#22c55e", light: "#bbf7d0" },
  investment: { solid: "#3b82f6", light: "#bfdbfe" },
  custom: { solid: "#8b5cf6", light: "#ede9fe" },
  credit_card: { solid: "#f59e0b", light: "#fde68a" },
};

function accentFor(type: string | null) {
  return accentByType[type ?? ""] ?? { solid: "#86efac", light: "#dcfce7" };
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const allocated = payload.find((p) => p.name === "allocated")?.value ?? 0;
  const actual = payload.find((p) => p.name === "actual")?.value ?? 0;
  const diff = actual - allocated;
  const isOver = diff > 0;

  function fmt(n: number) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-green-950">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-green-400">allocated</span>
          <span className="font-mono tabular-nums text-green-800">{fmt(allocated)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-green-400">actual</span>
          <span className="font-mono tabular-nums text-green-800">{fmt(actual)}</span>
        </div>
        {allocated > 0 && (
          <div className="mt-2 border-t border-green-50 pt-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                isOver
                  ? "bg-red-50 text-red-500"
                  : "bg-green-50 text-green-600"
              }`}
            >
              {isOver
                ? `${fmt(diff)} over budget`
                : `${fmt(-diff)} under budget`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function BarChartSkeleton() {
  return (
    <div className="flex h-[260px] items-end gap-3 px-4 pb-6">
      {[80, 50, 110, 70, 90].map((h, i) => (
        <div key={i} className="flex flex-1 items-end gap-1">
          <div
            className="flex-1 animate-pulse rounded-t-md bg-green-100"
            style={{ height: `${h}px` }}
          />
          <div
            className="flex-1 animate-pulse rounded-t-md bg-green-200"
            style={{ height: `${h * 0.75}px` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryBarChart({
  budget,
  summaryData,
  categories,
  isLoading,
}: {
  budget: BudgetWithAllocations;
  summaryData: SummaryRow[];
  categories: Category[];
  isLoading: boolean;
}) {
  const income = Number(budget.income ?? 0);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const totalBycat = new Map(
    summaryData.map((r) => [r.categoryId, Number(r.total ?? 0)]),
  );

  // Build one bar-group per category that has an allocation or actual entries
  const catIds = new Set([
    ...budget.allocations.map((a) => a.categoryId),
    ...summaryData.map((r) => r.categoryId),
  ]);

  const data = Array.from(catIds)
    .map((catId) => {
      const cat = catById.get(catId);
      if (!cat) return null;
      const alloc = budget.allocations.find((a) => a.categoryId === catId);
      const allocated = alloc ? (income * alloc.allocationPct) / 100 : 0;
      const actual = totalBycat.get(catId) ?? 0;
      const accent = accentFor(cat.type);
      return {
        name: `${cat.emoji ?? ""} ${cat.name}`,
        allocated,
        actual,
        type: cat.type ?? "",
        solidColor: accent.solid,
        lightColor: accent.light,
      };
    })
    .filter(Boolean) as {
    name: string;
    allocated: number;
    actual: number;
    type: string;
    solidColor: string;
    lightColor: string;
  }[];

  const hasData = data.some((d) => d.allocated > 0 || d.actual > 0);

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-green-400">
        budget vs actual
      </p>

      {isLoading ? (
        <BarChartSkeleton />
      ) : !hasData ? (
        <div className="flex h-[260px] items-center justify-center">
          <p className="text-sm text-green-400">no budget allocations set for this month</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="30%" barGap={4}>
            <CartesianGrid vertical={false} stroke="#f0fdf4" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#86efac", fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0fdf4" }} />
            {/* Allocated bar — light fill using per-row colour */}
            <Bar
              dataKey="allocated"
              name="allocated"
              radius={[4, 4, 0, 0]}
              barSize={14}
              fill="#bbf7d0"
              // Override per-bar with a Cell approach via shape
            />
            {/* Actual bar — solid fill */}
            <Bar
              dataKey="actual"
              name="actual"
              radius={[4, 4, 0, 0]}
              barSize={14}
              fill="#22c55e"
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      {!isLoading && hasData && (
        <div className="mt-3 flex items-center gap-4 text-xs text-green-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200" /> allocated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> actual
          </span>
        </div>
      )}
    </div>
  );
}
