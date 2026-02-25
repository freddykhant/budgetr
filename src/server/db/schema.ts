import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTableCreator,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

export const createTable = pgTableCreator((name) => `budgetr_${name}`);

// ─── Enums ────────────────────────────────────────────────────────────────────

export const categoryTypeEnum = pgEnum("category_type", [
  "spending",
  "saving",
  "investment",
  "credit_card",
  "custom",
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

// ─── Budget & Settings ────────────────────────────────────────────────────────

export const userSettings = createTable(
  "user_settings",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    monthlyIncome: d.numeric({ precision: 10, scale: 2 }).notNull(),
    onboardingCompleted: d.boolean().notNull().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    unique("user_settings_user_id_uniq").on(t.userId),
    index("user_settings_user_id_idx").on(t.userId),
  ],
);

export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    name: d.varchar({ length: 255 }).notNull(),
    emoji: d.varchar({ length: 16 }),
    color: d.varchar({ length: 32 }),
    type: categoryTypeEnum().notNull().default("spending"),
    sortOrder: d.integer().notNull().default(0),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("category_user_id_idx").on(t.userId),
    unique("category_user_name_uniq").on(t.userId, t.name),
  ],
);

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
    income: d.numeric({ precision: 10, scale: 2 }).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("budget_user_id_idx").on(t.userId),
    unique("budget_user_month_year_uniq").on(t.userId, t.month, t.year),
  ],
);

export const budgetAllocations = createTable(
  "budget_allocation",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    budgetId: d
      .integer()
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    allocationPct: d.integer().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("budget_allocation_budget_id_idx").on(t.budgetId),
    unique("budget_allocation_budget_category_uniq").on(
      t.budgetId,
      t.categoryId,
    ),
  ],
);

// ─── Entries & Goals ──────────────────────────────────────────────────────────

export const entries = createTable(
  "entry",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    description: d.varchar({ length: 255 }),
    // Redundant month/year to make queries efficient and avoid extracting from date
    date: d.date().notNull(),
    month: d.integer().notNull(),
    year: d.integer().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("entry_user_id_idx").on(t.userId),
    index("entry_category_id_idx").on(t.categoryId),
    index("entry_month_year_idx").on(t.year, t.month),
  ],
);

export const categoryGoals = createTable(
  "category_goal",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: d.varchar({ length: 255 }).notNull(),
    targetAmount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("category_goal_user_id_idx").on(t.userId),
    unique("category_goal_category_id_uniq").on(t.categoryId),
  ],
);

// ─── Credit Card Trackers ─────────────────────────────────────────────────────

export const creditCardTrackers = createTable(
  "credit_card_tracker",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    cardName: d.varchar({ length: 255 }).notNull(),
    spendTarget: d.numeric({ precision: 10, scale: 2 }).notNull(),
    bonusPoints: d.integer().notNull().default(0),
    startDate: d.date().notNull(),
    endDate: d.date().notNull(),
    paidInFull: d.boolean().notNull().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("credit_card_tracker_user_id_idx").on(t.userId),
    unique("credit_card_tracker_category_id_uniq").on(t.categoryId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  budgets: many(budgets),
  categories: many(categories),
  entries: many(entries),
  goals: many(categoryGoals),
  creditCardTrackers: many(creditCardTrackers),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  entries: many(entries),
  allocations: many(budgetAllocations),
  goals: many(categoryGoals),
  creditCardTracker: many(creditCardTrackers),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  allocations: many(budgetAllocations),
}));

export const budgetAllocationsRelations = relations(
  budgetAllocations,
  ({ one }) => ({
    budget: one(budgets, {
      fields: [budgetAllocations.budgetId],
      references: [budgets.id],
    }),
    category: one(categories, {
      fields: [budgetAllocations.categoryId],
      references: [categories.id],
    }),
  }),
);

export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(users, { fields: [entries.userId], references: [users.id] }),
  category: one(categories, {
    fields: [entries.categoryId],
    references: [categories.id],
  }),
}));

export const categoryGoalsRelations = relations(
  categoryGoals,
  ({ one }) => ({
    user: one(users, { fields: [categoryGoals.userId], references: [users.id] }),
    category: one(categories, {
      fields: [categoryGoals.categoryId],
      references: [categories.id],
    }),
  }),
);

export const creditCardTrackersRelations = relations(
  creditCardTrackers,
  ({ one }) => ({
    user: one(users, {
      fields: [creditCardTrackers.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [creditCardTrackers.categoryId],
      references: [categories.id],
    }),
  }),
);
