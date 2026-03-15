# Budgie — Product & Engineering Recommendations

## Fix These First (Gaps in the Core Loop)

**1. Can't create new categories from Settings**
The modal only edits allocations for existing categories. A user who wants to add a credit card or custom category has no way to do it post-onboarding. This is the biggest workflow gap.

**2. Month navigation on detail pages**
History has it, but `/spending`, `/savings`, `/investments`, `/custom/[id]` are all locked to the current month. You can't look back. For a budget app, this is essential.

**3. Confirm before delete on entries**
Subscriptions already do this. `EditableEntryRow` doesn't. One fat-finger on a transaction delete and it's gone silently.

---

## Highest-Impact Features to Build Next

**1. Recurring transactions**
Most people's biggest expenses (rent, gym, streaming) are the same every month. Let users mark an entry as recurring and have it auto-populate each month. The `subscription` table is close — but subscriptions don't appear in spending totals, they're tracked separately. Bridging this gap would make the core loop much more accurate.

**2. PWA / mobile-first experience**
Budgeting is a capture-at-point-of-purchase behavior. Right now it's a desktop web app. A lightweight PWA with a sticky "add transaction" fab and a minimal mobile layout would 10x daily active usage. People aren't logging their coffee at a desk.

**3. Budget rollover / overspend handling**
What happens if you overspend in March? Right now nothing — the numbers just go red. A "rollover" mode that deducts overspend from next month's allocation (or warns you) is the difference between a useful tool and a scorecard.

**4. Payday-aware budget resets**
The `paydayOfMonth` field exists in the schema but isn't used for anything meaningful. If someone gets paid on the 15th, their "month" should run 15th→14th, not 1st→31st. This is a huge differentiator vs every other budget app.

**5. Bank sync (Basiq for AU)**
Manual entry is the biggest drop-off point for budget apps. Basiq is the Australian open banking API — you could pull in transactions automatically and let users categorise them. This is the feature that makes daily active use go from "discipline required" to "just works."

---

## Smaller Wins

- **Export to CSV** — one tRPC procedure + a download button. Finance-savvy users will ask for this immediately.
- **Subscription soft-disable** — the schema already has `isActive` but there's no toggle in the UI. Some subscriptions are paused, not cancelled.
- **Category drag-to-reorder** — the `category.reorder` mutation exists, no UI wired to it. Low-effort, high satisfaction.
- **"Last month" context line** on detail pages — a single line like *"vs $420 last March"* adds enormous perceived value.
- **Currency preference** — AUD is hardcoded everywhere. One settings field and a format utility swap unlocks international users.

---

## Engineering Debt to Address

- **Zero tests** — the tRPC procedures have real business logic (budget seeding from prior months, allocation validation) that should be unit tested. One wrong migration and user data is silently corrupted.
- **No error boundaries** — tRPC errors fail silently. Add a global error boundary and a `/error` page.
- **Auth sender domain** — still on `onboarding@resend.dev`. OTP emails will land in spam for most users in production. Verify a real domain.
- **`entry.clearMonth` is orphaned** — it's a mutation with no UI. Either expose it or delete it.

---

## Longer-Term (If This Gets Traction)

- **Shared budgets** — couples and housemates splitting finances is a massive underserved use case. The schema would need a `household` layer above `user`.
- **Net worth tracker** — investments + savings totals are already there. Adding asset/liability tracking makes this a full personal finance dashboard, not just a budget app.
- **AI categorisation** — when bank sync lands, auto-categorising transactions with a small LLM call (Claude Haiku would be fast/cheap enough) removes the last manual step.
