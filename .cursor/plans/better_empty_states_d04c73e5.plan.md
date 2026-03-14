---
name: Better Empty States
overview: Replace all 14 bare-text empty states with warm, on-brand, action-oriented states using a shared EmptyState component — consistently using the BudgieMascot, a headline, supporting copy, and optional CTAs.
todos:
  - id: es1
    content: Create shared EmptyState component
    status: completed
  - id: es2
    content: Update spending-page-client.tsx — no transactions empty state
    status: completed
  - id: es3
    content: Update savings-page-client.tsx — no categories (page) + no contributions (per-card)
    status: completed
  - id: es4
    content: Update investments-page-client.tsx — no categories (page) + no contributions (per-card)
    status: completed
  - id: es5
    content: Update custom-category-page-client.tsx — no entries + no goal
    status: completed
  - id: es6
    content: Update savings-card.tsx and investments-card.tsx dashboard empty states
    status: completed
  - id: es7
    content: Update credit-card-page-client.tsx no spend logged state
    status: completed
isProject: false
---

# Better Empty States

## The gap

Every empty state today is a plain `<p>` or two with grey text. No visual anchor, no personality, no next-step guidance. Compare:

- `savings-card.tsx` already uses `BudgieMascot` with `bob` — this is the target standard
- `investments-card.tsx` is an unstyled `<p>` — inconsistent even at the dashboard level

## Design approach (Silicon Valley standard)

Every empty state = **mascot** + **headline** + **body** + optional **action link/button**.

- Small/inline contexts (dashboard cards, per-category "no allocation") → compact: mascot + 1 line
- Full page-level or section-level → full: mascot + headline + body + CTA

Accent colors are inherited per-page (orange / green / blue / violet) so empty states feel native to each section.

## Architecture

**New shared component:** `[src/app/_components/empty-state.tsx](src/app/_components/empty-state.tsx)`

```tsx
<EmptyState
  mascotSize={48}
  animate="bob" // "bob" | "float" | "tilt"
  headline="nothing logged yet"
  body="tap 'add transaction' above to start tracking."
  action={{ label: "go to settings", href: "/settings" }} // optional
/>
```

Renders: centered column, mascot at top, `text-green-950` headline, `text-green-500` body, optional ghost-style action link.

## States to update (14 total, 3 tiers)

**Tier 1 — Full empty states on detail pages (5)**

| Location                               | Condition        | Headline                 | Body                                                   |
| -------------------------------------- | ---------------- | ------------------------ | ------------------------------------------------------ |
| `spending-page-client.tsx`             | No transactions  | "nothing logged yet"     | "tap 'add transaction' above to start."                |
| `savings-page-client.tsx` per-card     | No contributions | "ready to start saving?" | "log your first contribution above."                   |
| `investments-page-client.tsx` per-card | No contributions | "no contributions yet"   | "add your first entry above to start building wealth." |
| `custom-category-page-client.tsx`      | No entries       | "nothing tracked yet"    | "log your first entry above to watch this grow."       |
| `custom-category-page-client.tsx`      | No goal set      | "no goal yet"            | "tap 'set goal' above to give this category a target." |

**Tier 2 — Page-level "no categories" (2)**

| Location                      | Condition                | CTA                            |
| ----------------------------- | ------------------------ | ------------------------------ |
| `savings-page-client.tsx`     | No saving categories     | "go to settings" → `/settings` |
| `investments-page-client.tsx` | No investment categories | "go to settings" → `/settings` |

These get a larger mascot (`size={64}`, `animate="float"`) since they occupy the full page.

**Tier 3 — Dashboard card compact states (2)**

| Location               | Condition                | Treatment                                          |
| ---------------------- | ------------------------ | -------------------------------------------------- |
| `savings-card.tsx`     | No saving categories     | Already has `BudgieMascot` — improve copy only     |
| `investments-card.tsx` | No investment categories | Add `BudgieMascot` + center, matching savings-card |

**Inline contextual hints (4 — no mascot, just improved copy)**

- `savings-page-client.tsx` no monthly allocation
- `investments-page-client.tsx` no monthly allocation
- `credit-card-section.tsx` no tracker configured
- `credit-card-page-client.tsx` no spend logged (small mascot + copy, since it has its own panel)

## Files changed

- New: `[src/app/_components/empty-state.tsx](src/app/_components/empty-state.tsx)`
- `[src/app/_components/spending-page-client.tsx](src/app/_components/spending-page-client.tsx)`
- `[src/app/_components/savings-page-client.tsx](src/app/_components/savings-page-client.tsx)`
- `[src/app/_components/investments-page-client.tsx](src/app/_components/investments-page-client.tsx)`
- `[src/app/_components/custom-category-page-client.tsx](src/app/_components/custom-category-page-client.tsx)`
- `[src/app/_components/savings-card.tsx](src/app/_components/savings-card.tsx)`
- `[src/app/_components/investments-card.tsx](src/app/_components/investments-card.tsx)`
- `[src/app/_components/credit-card-page-client.tsx](src/app/_components/credit-card-page-client.tsx)`
