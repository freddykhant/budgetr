import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  budgetAllocations,
  budgets,
  categories,
  userSettings,
} from "~/server/db/schema";

const monthYearInput = z
  .object({
    month: z.number().min(1).max(12),
    year: z.number(),
  })
  .optional();

export const budgetRouter = createTRPCRouter({
  getOrCreateCurrent: protectedProcedure
    .input(monthYearInput)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();

      const month = input?.month ?? now.getMonth() + 1;
      const year = input?.year ?? now.getFullYear();

      const existing = await ctx.db.query.budgets.findFirst({
        where: and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
        with: {
          allocations: {
            with: {
              category: true,
            },
          },
        },
      });

      if (existing) return existing;

      // Try to seed from previous budget, otherwise from settings (or 0)
      const previous = await ctx.db.query.budgets.findFirst({
        where: eq(budgets.userId, userId),
        orderBy: [desc(budgets.year), desc(budgets.month)],
      });

      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      const income =
        previous?.income ??
        settings?.monthlyIncome ??
        "0";

      const [createdBudget] = await ctx.db
        .insert(budgets)
        .values({
          userId,
          month,
          year,
          income,
        })
        .returning();

      // If there was a previous budget, copy its allocations
      if (previous) {
        const previousAllocations =
          await ctx.db.query.budgetAllocations.findMany({
            where: eq(budgetAllocations.budgetId, previous.id),
          });

        if (previousAllocations.length > 0) {
          await ctx.db
            .insert(budgetAllocations)
            .values(
              previousAllocations.map((a) => ({
                budgetId: createdBudget.id,
                categoryId: a.categoryId,
                allocationPct: a.allocationPct,
              })),
            );
        }
      }

      const withAllocations = await ctx.db.query.budgets.findFirst({
        where: eq(budgets.id, createdBudget.id),
        with: {
          allocations: {
            with: {
              category: true,
            },
          },
        },
      });

      return withAllocations!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        income: z.number().positive().optional(),
        allocations: z
          .array(
            z.object({
              categoryId: z.number(),
              allocationPct: z.number().min(0).max(100),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.budgets.findFirst({
        where: and(
          eq(budgets.userId, userId),
          eq(budgets.month, input.month),
          eq(budgets.year, input.year),
        ),
      });

      if (!existing) {
        throw new Error("Budget not found");
      }

      const [updatedBudget] = await ctx.db
        .update(budgets)
        .set({
          ...(input.income !== undefined && {
            income: input.income.toString(),
          }),
        })
        .where(eq(budgets.id, existing.id))
        .returning();

      if (input.allocations) {
        // Ensure categories belong to user
        const userCategories = await ctx.db.query.categories.findMany({
          where: eq(categories.userId, userId),
        });
        const allowedIds = new Set(userCategories.map((c) => c.id));

        const values = input.allocations.filter((a) =>
          allowedIds.has(a.categoryId),
        );

        // Replace allocations for this budget with the new set
        await ctx.db
          .delete(budgetAllocations)
          .where(eq(budgetAllocations.budgetId, updatedBudget.id));

        if (values.length > 0) {
          await ctx.db
            .insert(budgetAllocations)
            .values(
              values.map((a) => ({
                budgetId: updatedBudget.id,
                categoryId: a.categoryId,
                allocationPct: a.allocationPct,
              })),
            );
        }
      }

      const withAllocations = await ctx.db.query.budgets.findFirst({
        where: eq(budgets.id, updatedBudget.id),
        with: {
          allocations: {
            with: {
              category: true,
            },
          },
        },
      });

      return withAllocations!;
    }),
});

