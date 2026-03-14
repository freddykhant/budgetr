"use client";

import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { api } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  name: string;
  emoji: string | null;
  type: string | null;
};

type BudgetMonth = {
  month: number;
  year: number;
  income: string | number;
};

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
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-green-950">{label}</p>
      <div className="space-y-1">
        {payload
          .filter((p) => p.name !== "income")
          .map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-green-500">{p.name}</span>
              </div>
              <span className="font-mono tabular-nums text-green-800">{fmt(p.value)}</span>
            </div>
          ))}
        {payload.find((p) => p.name === "income") && (
          <div className="mt-1.5 border-t border-green-50 pt-1.5 text-xs text-green-400">
            income: {fmt(payload.find((p) => p.name === "income")!.value)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inner chart (receives all monthlySummary data) ───────────────────────────

function TrendChartInner({
  trendMonths,
  categories,
  selectedMonth,
  selectedYear,
  summaries,
}: {
  trendMonths: BudgetMonth[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
  summaries: Map<string, { categoryId: number; total: string | null }[]>;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  const data = trendMonths.map((b) => {
    const key = `${b.year}-${b.month}`;
    const rows = summaries.get(key) ?? [];

    let spending = 0, saving = 0, investment = 0;
    rows.forEach(({ categoryId, total }) => {
      const cat = catById.get(categoryId);
      const amt = Number(total ?? 0);
      if (cat?.type === "spending") spending += amt;
      else if (cat?.type === "saving") saving += amt;
      else if (cat?.type === "investment") investment += amt;
    });

    return {
      label: format(new Date(b.year, b.month - 1, 1), "MMM"),
      key,
      spending,
      saving,
      investment,
      income: Number(b.income ?? 0),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="gradSpending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSaving" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradInvestment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f0fdf4" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#86efac", fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#dcfce7", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="spending"
          name="spending"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#gradSpending)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#f97316" }}
        />
        <Area
          type="monotone"
          dataKey="saving"
          name="saving"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#gradSaving)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#22c55e" }}
        />
        <Area
          type="monotone"
          dataKey="investment"
          name="investment"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gradInvestment)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
        />
        {/* Income reference line */}
        <Line
          type="monotone"
          dataKey="income"
          name="income"
          stroke="#86efac"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
        {/* Selected month indicator */}
        <ReferenceLine
          x={format(new Date(selectedYear, selectedMonth - 1, 1), "MMM")}
          stroke="#22c55e"
          strokeOpacity={0.5}
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Wrapper that fires parallel monthlySummary queries for trend months ───────

export function HistoryTrendChart({
  budgets,
  categories,
  selectedMonth,
  selectedYear,
}: {
  budgets: BudgetMonth[];
  categories: Category[];
  selectedMonth: number;
  selectedYear: number;
}) {
  // Take up to 6 most recent budgets for the trend
  const trendMonths = [...budgets.slice(0, 6)].reverse();

  // Parallel queries — one per trend month
  const q0 = api.entry.monthlySummary.useQuery(
    trendMonths[0] ? { month: trendMonths[0].month, year: trendMonths[0].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[0] },
  );
  const q1 = api.entry.monthlySummary.useQuery(
    trendMonths[1] ? { month: trendMonths[1].month, year: trendMonths[1].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[1] },
  );
  const q2 = api.entry.monthlySummary.useQuery(
    trendMonths[2] ? { month: trendMonths[2].month, year: trendMonths[2].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[2] },
  );
  const q3 = api.entry.monthlySummary.useQuery(
    trendMonths[3] ? { month: trendMonths[3].month, year: trendMonths[3].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[3] },
  );
  const q4 = api.entry.monthlySummary.useQuery(
    trendMonths[4] ? { month: trendMonths[4].month, year: trendMonths[4].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[4] },
  );
  const q5 = api.entry.monthlySummary.useQuery(
    trendMonths[5] ? { month: trendMonths[5].month, year: trendMonths[5].year } : { month: 1, year: 2000 },
    { enabled: !!trendMonths[5] },
  );

  const queries = [q0, q1, q2, q3, q4, q5];
  const isLoading = queries.some((q) => q.isLoading && trendMonths[queries.indexOf(q)]);

  const summaries = new Map<string, { categoryId: number; total: string | null }[]>();
  trendMonths.forEach((b: BudgetMonth, i: number) => {
    const key = `${b.year}-${b.month}`;
    summaries.set(key, queries[i]?.data ?? []);
  });

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-green-400">
        6-month trend
      </p>

      {isLoading ? (
        <div className="h-[220px] animate-pulse rounded-xl bg-green-50" />
      ) : trendMonths.length < 2 ? (
        <div className="flex h-[220px] items-center justify-center">
          <p className="text-center text-sm text-green-400">
            need at least 2 months of data to show a trend
          </p>
        </div>
      ) : (
        <>
          <TrendChartInner
            trendMonths={trendMonths}
            categories={categories}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            summaries={summaries}
          />

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-green-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> spending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> savings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> investments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 border-b border-dashed border-green-300" /> income
            </span>
          </div>
        </>
      )}
    </div>
  );
}
