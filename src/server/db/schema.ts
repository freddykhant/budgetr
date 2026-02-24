import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTableCreator,
  primaryKey,
  unique,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

export const createTable = pgTableCreator((name) => `budgetr_${name}`);

// ─── Enums ────────────────────────────────────────────────────────────────────

export const transactionCategoryEnum = pgEnum("transaction_category", [
  "food_dining",
  "transport",
  "subscriptions",
  "personal_care",
  "entertainment",
  "shopping",
  "other",
]);

// ─── Auth tables (NextAuth) ───────────────────────────────────────────────────

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({ mode: "date", withTimezone: true })
    .$defaultFn(() => new Date()),
  image: d.varchar({ length: 255 }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Budget ───────────────────────────────────────────────────────────────────
// One row per user per calendar month — defines income and the 4-way split.

export const budgets = createTable(
  "budget",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    month: d.integer().notNull(), // 1–12
    year: d.integer().notNull(),
    income: d.numeric({ precision: 10, scale: 2 }).notNull().default("4100"),
    spendingPct: d.integer().notNull().default(30),
    savingsPct: d.integer().notNull().default(40),
    investPct: d.integer().notNull().default(20),
    travelPct: d.integer().notNull().default(10),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("budget_user_id_idx").on(t.userId),
    unique("budget_user_month_year_uniq").on(t.userId, t.month, t.year),
  ],
);

// ─── Transactions ─────────────────────────────────────────────────────────────
// Individual spending entries that count against the monthly spending budget.

export const transactions = createTable(
  "transaction",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    category: transactionCategoryEnum().notNull(),
    description: d.varchar({ length: 255 }),
    date: d.date().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("transaction_user_id_idx").on(t.userId),
    index("transaction_date_idx").on(t.date),
  ],
);

// ─── Savings ──────────────────────────────────────────────────────────────────
// A savings goal (e.g. Emergency Fund) with per-month contribution logs.

export const savingsGoals = createTable(
  "savings_goal",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    name: d.varchar({ length: 255 }).notNull(),
    targetAmount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("savings_goal_user_id_idx").on(t.userId)],
);

export const savingsContributions = createTable(
  "savings_contribution",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    goalId: d
      .integer()
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    month: d.integer().notNull(),
    year: d.integer().notNull(),
    grewByHundred: d.boolean().notNull().default(false), // ANZ bonus qualifier
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("savings_contribution_goal_id_idx").on(t.goalId),
    unique("savings_contribution_goal_month_year_uniq").on(
      t.goalId,
      t.month,
      t.year,
    ),
  ],
);

// ─── Investments ──────────────────────────────────────────────────────────────
// Monthly ETF contribution entries + a snapshot of total portfolio value.

export const investments = createTable(
  "investment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    portfolioValue: d.numeric({ precision: 10, scale: 2 }),
    month: d.integer().notNull(),
    year: d.integer().notNull(),
    note: d.varchar({ length: 255 }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("investment_user_id_idx").on(t.userId),
    unique("investment_user_month_year_uniq").on(t.userId, t.month, t.year),
  ],
);

// ─── Travel Funds ─────────────────────────────────────────────────────────────
// A named travel goal with per-month contribution logs.

export const travelFunds = createTable(
  "travel_fund",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    name: d.varchar({ length: 255 }).notNull(), // e.g. "Japan Trip"
    targetAmount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("travel_fund_user_id_idx").on(t.userId)],
);

export const travelContributions = createTable(
  "travel_contribution",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    fundId: d
      .integer()
      .notNull()
      .references(() => travelFunds.id, { onDelete: "cascade" }),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    month: d.integer().notNull(),
    year: d.integer().notNull(),
    note: d.varchar({ length: 255 }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("travel_contribution_fund_id_idx").on(t.fundId),
    unique("travel_contribution_fund_month_year_uniq").on(
      t.fundId,
      t.month,
      t.year,
    ),
  ],
);

// ─── Credit Card Goals ────────────────────────────────────────────────────────
// Tracks spend-to-bonus progress for a credit card sign-up bonus.

export const creditCardGoals = createTable(
  "credit_card_goal",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    cardName: d.varchar({ length: 255 }).notNull(),
    spendTarget: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currentSpend: d
      .numeric({ precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    bonusPoints: d.integer().notNull().default(0),
    startDate: d.date().notNull(),
    endDate: d.date().notNull(), // startDate + 90 days
    paidInFull: d.boolean().notNull().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("credit_card_goal_user_id_idx").on(t.userId)],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  budgets: many(budgets),
  transactions: many(transactions),
  savingsGoals: many(savingsGoals),
  savingsContributions: many(savingsContributions),
  investments: many(investments),
  travelFunds: many(travelFunds),
  travelContributions: many(travelContributions),
  creditCardGoals: many(creditCardGoals),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const savingsGoalsRelations = relations(
  savingsGoals,
  ({ one, many }) => ({
    user: one(users, { fields: [savingsGoals.userId], references: [users.id] }),
    contributions: many(savingsContributions),
  }),
);

export const savingsContributionsRelations = relations(
  savingsContributions,
  ({ one }) => ({
    goal: one(savingsGoals, {
      fields: [savingsContributions.goalId],
      references: [savingsGoals.id],
    }),
    user: one(users, {
      fields: [savingsContributions.userId],
      references: [users.id],
    }),
  }),
);

export const investmentsRelations = relations(investments, ({ one }) => ({
  user: one(users, { fields: [investments.userId], references: [users.id] }),
}));

export const travelFundsRelations = relations(travelFunds, ({ one, many }) => ({
  user: one(users, { fields: [travelFunds.userId], references: [users.id] }),
  contributions: many(travelContributions),
}));

export const travelContributionsRelations = relations(
  travelContributions,
  ({ one }) => ({
    fund: one(travelFunds, {
      fields: [travelContributions.fundId],
      references: [travelFunds.id],
    }),
    user: one(users, {
      fields: [travelContributions.userId],
      references: [users.id],
    }),
  }),
);

export const creditCardGoalsRelations = relations(
  creditCardGoals,
  ({ one }) => ({
    user: one(users, {
      fields: [creditCardGoals.userId],
      references: [users.id],
    }),
  }),
);
