---
name: Past Months History
overview: Add a dedicated `/history` route that lets users navigate between past months, view per-month budget vs actual stats, and see trends across the last 6 months — backed by two new tRPC procedures and recharts for visualisation.
todos:
  - id: h1
    content: Install recharts
    status: completed
  - id: h2
    content: Add budget.listMonths and entry.monthlySummary tRPC procedures
    status: completed
  - id: h3
    content: Create src/app/history/page.tsx server component
    status: completed
  - id: h4
    content: Build HistoryPageClient — month navigator + summary stat cards
    status: completed
  - id: h5
    content: Build Budget vs Actual grouped bar chart
    status: completed
  - id: h6
    content: Build spending breakdown donut chart
    status: completed
  - id: h7
    content: Build 6-month trend area chart
    status: completed
  - id: h8
    content: Add history link to dashboard-client.tsx
    status: completed
isProject: false
---

# Past Months History

## Data model summary

The schema already stores everything needed:

- `entries` — `userId, categoryId, amount, month, year, date`
- `budgets` — `userId, month, year, income`
- `budgetAllocations` — `budgetId, categoryId, allocationPct`

Missing: no "read-only budget getter" (only `getOrCreateCurrent` which auto-creates), and no server-side monthly aggregation.

## New tRPC procedures

`**[src/server/api/routers/budget.ts](src/server/api/routers/budget.ts)` — add `listMonths**`

Returns every budget the user has ever had, ordered newest first. Used for month navigation bounds and to seed the trend chart.

```ts
listMonths: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.query.budgets.findMany({
    where: eq(budgets.userId, ctx.session.user.id),
    orderBy: [desc(budgets.year), desc(budgets.month)],
    with: { allocations: { with: { category: true } } },
  });
}),
```

`**[src/server/api/routers/entry.ts](src/server/api/routers/entry.ts)` — add `monthlySummary**`

Aggregates entry totals per category for a specific month — avoids shipping every individual row to the client.

```ts
monthlySummary: protectedProcedure
  .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
  .query(async ({ ctx, input }) => {
    return ctx.db
      .select({
        categoryId: entries.categoryId,
        total: sql<string>`sum(${entries.amount})`,
      })
      .from(entries)
      .where(and(
        eq(entries.userId, ctx.session.user.id),
        eq(entries.month, input.month),
        eq(entries.year, input.year),
      ))
      .groupBy(entries.categoryId);
  }),
```

## Install recharts

```bash
npm install recharts
```

React-native SVG charts, TypeScript-friendly, no peer conflicts with React 19 / Next.js 15.

## New route

`**[src/app/history/page.tsx](src/app/history/page.tsx)**` — server component, same auth + onboarding guard pattern as `/home/page.tsx`. Renders `<Header>` + `<HistoryPageClient>`.

`**[src/app/_components/history-page-client.tsx](src/app/_components/history-page-client.tsx)**` — the full client component described below.

## Page layout

```
┌─────────────────────────────────────────────┐
│  ← back          history          [Mar ▼]   │
│                                              │
│      ‹   March 2025   ›                     │
├────────────┬────────────┬────────────┬───────┤
│ Income     │ Spent      │ Saved      │Invest │
│ $8,400     │ $3,200     │ $1,600     │ $800  │
├─────────────────────────────────────────────┤
│  Budget vs Actual  (grouped bar chart)       │
├────────────────────┬────────────────────────┤
│  Spending breakdown│  6-month trend          │
│  (donut / ring)    │  (stacked area chart)   │
└────────────────────┴────────────────────────┘
```

## Section design details

### Month navigator

- Container: `rounded-2xl border border-green-100 bg-white px-6 py-4 shadow-sm` — same card vocabulary as the rest of the app
- `ChevronLeft` / `ChevronRight` (lucide) for prev/next navigation, `disabled` + `opacity-30 cursor-not-allowed` at the first/last known month
- Center: selected month in `text-xl font-semibold tracking-tight text-green-950`
- Right: a native `<select>` styled `border border-green-200 bg-green-50 rounded-lg px-2 py-1 text-sm text-green-700` listing every month from `listMonths` as a jump shortcut
- On mount: defaults to the most recently **completed** month (i.e. previous calendar month, not the current one)

### Summary stat cards (4)

- Grid: `grid-cols-2 md:grid-cols-4 gap-4`
- Each card: `rounded-2xl border bg-white p-5 shadow-sm` — border color matches type accent (orange/green/green/blue)
- Label: `text-xs font-semibold uppercase tracking-widest` in accent color
- Hero number: `font-mono text-3xl font-semibold tabular-nums text-green-950`
- Delta badge (where prior month data exists): `+$200 vs last month` in `text-xs text-green-400` for savings/investments
- Loading skeleton: `h-8 w-28 animate-pulse rounded-lg bg-green-100` per card
- Card order: Income · Spent · Saved · Invested

### Budget vs Actual grouped bar chart

- `recharts` `BarChart` inside `ResponsiveContainer height={260}`
- Two bars per category: "allocated $" (lighter, 40% opacity of accent) and "actual $" (solid accent fill)
- Accent colors: orange for spending, green for savings, blue for investments, violet for custom
- `XAxis` tick formatter: `emoji + " " + name`, `axisLine={false}`, `tickLine={false}`, `tick={{ fill: "#86efac", fontSize: 12 }}`
- `YAxis`: hidden
- `CartesianGrid`: horizontal only, `stroke="#f0fdf4"` (faint green)
- `Bars`: `radius={[4, 4, 0, 0]}`, `barSize={14}`, `barCategoryGap="30%"`
- Custom `<Tooltip>`: white card `rounded-xl border border-green-100 bg-white shadow-lg px-4 py-3` — category name, allocated $, actual $, and a pill "under budget" (green) or "over budget" (red/orange)
- Loading skeleton: 5 columns of two `animate-pulse` rounded rectangles

### Spending breakdown donut / ring

- `recharts` `PieChart` with `innerRadius="58%"` `outerRadius="82%"` — clean ring shape
- `paddingAngle={3}` for visible gaps between slices
- Center label rendered via absolute overlay: `font-mono text-2xl font-semibold text-green-950` for total spent, `text-xs text-green-400` subtitle "total spent"
- Each slice uses that spending category's color (or a palette of greens/oranges/blues if the category has no explicit color set)
- On hover: active slice gets `strokeWidth={2} stroke="white"` with a custom tooltip card
- Legend below: horizontal flex-wrap of `rounded-full border px-3 py-1 text-sm` pills — one per category with emoji and dollar amount
- Empty: `<EmptyState mascotSize={40} animate="bob" headline="no spending logged" body="...">` inside the chart panel

### 6-month trend area chart

- `recharts` `AreaChart` inside `ResponsiveContainer height={220}`
- Three `<Area>` layers: spending (orange `#fb923c` / `#fed7aa`), savings (green `#22c55e` / `#bbf7d0`), investments (blue `#3b82f6` / `#bfdbfe`)
- `type="monotone"`, `dot={false}`, `activeDot={{ r: 4, strokeWidth: 0 }}`
- Thin dashed `<Line>` in `#86efac` for the income reference line
- `<ReferenceLine>` for the currently selected month: thin vertical `stroke="#22c55e"` `strokeOpacity={0.5}` with a small label above
- `XAxis`: short month labels (`"Mar"`, `"Apr"`), `axisLine={false}`, `tickLine={false}`, `text-xs text-green-400`
- `YAxis`: hidden
- `CartesianGrid`: horizontal only, faint `#f0fdf4`
- Custom tooltip: same white card style — shows month + breakdown of spending / savings / investments
- Data source: `entry.monthlySummary` called for each of the 6 months from `listMonths` (parallel tRPC queries enabled once `category.list` resolves)
- Loading: full-height `animate-pulse rounded-2xl bg-green-50` block

### Loading and empty states

- Each section has an **independent** skeleton — the page progressively fills in rather than waiting for all data
- Month with no budget at all: `<EmptyState mascotSize={64} animate="float" headline="no budget for this month" body="budgets are created automatically when you log entries.">` — charts are hidden
- Month with a budget but zero entries: stat cards show income + zeros, chart panels show `<EmptyState animate="bob">` inline

## Dashboard entry point

In `[src/app/_components/dashboard-client.tsx](src/app/_components/dashboard-client.tsx)`, in the greeting `<section>` right-side column (lines 121–134), add a `<Link href="/history">` pill below the month progress bar:

```tsx
<Link
  href="/history"
  className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-600 transition hover:border-green-300 hover:bg-green-100"
>
  <History size={13} /> view history
</Link>
```

## Files changed

- `npm install recharts`
- New: `[src/app/history/page.tsx](src/app/history/page.tsx)`
- New: `[src/app/_components/history-page-client.tsx](src/app/_components/history-page-client.tsx)`
- `[src/server/api/routers/budget.ts](src/server/api/routers/budget.ts)` — add `listMonths`
- `[src/server/api/routers/entry.ts](src/server/api/routers/entry.ts)` — add `monthlySummary`
- `[src/app/_components/dashboard-client.tsx](src/app/_components/dashboard-client.tsx)` — add history link
