# budgie — UX Improvements Backlog

Prioritised by effort-to-value ratio. Implemented items are checked.

---

## ✅ 1. Toast / Snackbar Notifications

**Status:** Implemented

**Problem:** Every mutation — logging a transaction, updating income, setting a goal, deleting an entry — completes in total silence. No confirmation that anything worked.

**Solution:** Smart, contextual snackbar that fires only when it adds value:
- Large savings/investment contributions → encouraging copy with personality
- Goal milestones hit (50%, 75%, 100%) → celebratory message
- Budget saved → simple confirmation
- Goal set or updated → short acknowledgement
- Routine spending entries and deletes → **silent** (too frequent, adds no value)

**Design:** White card, bottom-right, slide-up animation, auto-dismiss at 3.5s, max 2 visible at once.

---

## 2. Confirm Before Delete

**Status:** Pending

**Problem:** Tapping the trash icon on any entry instantly deletes it — no undo, no confirmation. One accidental tap wipes data.

**Solution:** Inline row-level confirmation (not a modal). On first tap, the row shifts to show "Delete? Confirm / Cancel" in place. Tap Confirm to proceed, Cancel to restore. No extra overlay needed.

**Scope:** Spending entries, savings entries, investment entries, custom category entries, credit card trackers.

---

## 3. Edit Transactions Inline

**Status:** Pending

**Problem:** Users can only delete transactions and re-add them if they made an error. There's no way to fix the amount, description, or date of an existing entry.

**Solution:** Tapping an entry row expands it inline into an edit form (same design as the add form). Pre-fills amount, description, and date. Save replaces the entry optimistically.

**Scope:** All entry types across all detail pages.

---

## 4. Month Navigation

**Status:** Pending

**Problem:** Every page only shows the current month. There is no way to review last month, compare periods, or see historical data. A finance app with no history is essentially a calculator.

**Solution:** Add `< March 2026 >` navigation to the top of each detail page and the dashboard. Changing month shifts all queries to use the selected `month` + `year`. Dashboard shows read-only historical view when not on the current month.

**Scope:** Dashboard, spending page, savings page, investments page, custom category page.

---

## 5. "Last Month" Context Line

**Status:** Pending

**Problem:** Users have no anchor to know if they're doing better or worse than usual. "I spent $1,340 this month" means nothing without a baseline.

**Solution:** One line under the current total on each detail page:
> `Last month: $1,240 of $1,500 · under by $260`

Low effort, high signal. Pulls the prior month's entries via a secondary query.

**Scope:** Spending, savings, investments, custom category detail pages.

---

## 6. Quick-Add Keyboard Shortcut

**Status:** Pending

**Problem:** On the spending page, logging a transaction is the most frequent action. Reaching for the `+` button every time adds friction, especially on desktop.

**Solution:** Press `N` (or `T` for transaction) anywhere on the spending detail page to open the add form and auto-focus the amount input. `Escape` dismisses. No modifier key needed — matches the mental model of finance power users.

**Scope:** Spending page only to start. Extend to savings/investments if adoption is good.

---

## 7. Better Empty States

**Status:** Pending

**Problem:** When a user has no data, components show plain grey text like `no savings categories set up.` — a dead end with no clear next action.

**Solution:** Illustrated empty states with a brief label and a direct CTA button:
- No spending category: `Set up a spending budget →` (links to settings)
- No entries yet: `Log your first transaction` (opens add form)
- No goal set: `Set a savings goal` (opens goal form)
- No credit cards: `Add a credit card` (links to settings)

Uses the same dashed-border card style already used in add-entry buttons for visual consistency.

**Scope:** All detail pages and dashboard cards.
