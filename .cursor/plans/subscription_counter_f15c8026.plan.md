---
name: Subscription Counter
overview: Add a standalone "Budgie Subscription Counter" — a new first-class feature with its own table, tRPC router, dashboard summary card, and detail page. Completely independent of the existing category/budget system.
todos:
  - id: s1
    content: Add subscriptions table to schema.ts and run db:push
    status: completed
  - id: s2
    content: Create subscription tRPC router and register it in root.ts
    status: completed
  - id: s3
    content: Build SubscriptionsCard dashboard summary component
    status: completed
  - id: s4
    content: Add SubscriptionsCard to dashboard-client.tsx
    status: completed
  - id: s5
    content: Create src/app/subscriptions/page.tsx server component
    status: completed
  - id: s6
    content: Build subscriptions-page-client.tsx with add/edit/delete and totals footer
    status: completed
isProject: false
---

# Budgie Subscription Counter

## Data Model

New table `budgetr_subscriptions` in `[src/server/db/schema.ts](src/server/db/schema.ts)`:

```ts
subscriptions = pgTable("budgetr_subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: varchar(255)
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar(255).notNull(), // e.g. "Netflix"
  emoji: varchar(10).notNull().default("💳"),
  amount: numeric(10, 2).notNull(), // always stored as monthly equivalent
  billingCycle: varchar(10).notNull().default("monthly"), // "monthly" | "yearly"
  color: varchar(50).notNull().default("violet"), // tailwind color key for visual variety
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().defaultNow(),
});
```

`billingCycle` is stored alongside `amount` so the UI can show "billed yearly" badges while summing the monthly-equivalent total. A yearly $120 subscription is stored as `amount: 10, billingCycle: "yearly"`.

## tRPC Router

New file `src/server/api/routers/subscription.ts` with four procedures:

- `list` — fetch all subscriptions for the current user, ordered by `createdAt desc`
- `create` — validate and insert a new subscription
- `update` — edit any field by id (with ownership check)
- `delete` — remove by id (with ownership check)

Register in `[src/server/api/root.ts](src/server/api/root.ts)` as `subscription`.

## Dashboard Card

New component `src/app/_components/subscriptions-card.tsx`:

- Queries `subscription.list`
- Shows: total monthly cost (large, bold), count chip ("N subscriptions"), top 3 emoji icons as a preview row
- Links to `/subscriptions`
- Placed in the dashboard as its own row, similar to the credit card section — only renders if the user has at least one subscription, OR always shows as an invite card with an "add your first subscription" CTA

## Detail Page

- **Server component:** `src/app/subscriptions/page.tsx` — auth guard + renders `Header` + `SubscriptionsPageClient`. Follows exact same pattern as `[src/app/savings/page.tsx](src/app/savings/page.tsx)`.
- **Client component:** `src/app/_components/subscriptions-page-client.tsx`
  - `BackButton` + stacked header ("subscriptions" title + subtitle showing total monthly cost)
  - Add-subscription inline form (name, emoji picker shortcut, amount, billing cycle toggle monthly/yearly)
  - List of subscription rows, each with inline edit (reusing the established edit pattern from `EditableEntryRow`) and delete
  - Summary footer: "total per month · total per year"

## Database Migration

Run `npm run db:push` after schema changes (no migration files needed, project uses `drizzle-kit push`).

## What this is NOT

- No category linkage
- No budget allocations or percentage targets
- No entries/history
- No goal tracking
