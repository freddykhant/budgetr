import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { budgets } from "~/server/db/schema";

export const budgetRouter = createTRPCRouter({
  // Get the budget for a given month/year, creating it with defaults if it doesn't exist.
  getOrCreate: protectedProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.budgets.findFirst({
        where: and(
          eq(budgets.userId, userId),
          eq(budgets.month, input.month),
          eq(budgets.year, input.year),
        ),
      });

      if (existing) return existing;

      const [created] = await ctx.db
        .insert(budgets)
        .values({ userId, month: input.month, year: input.year })
        .returning();

      return created!;
    }),

  // Update income or split percentages for a given month/year.
  update: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        income: z.number().positive().optional(),
        spendingPct: z.number().min(0).max(100).optional(),
        savingsPct: z.number().min(0).max(100).optional(),
        investPct: z.number().min(0).max(100).optional(),
        travelPct: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { month, year, income, spendingPct, savingsPct, investPct, travelPct } = input;

      const [updated] = await ctx.db
        .update(budgets)
        .set({
          ...(income !== undefined && { income: income.toString() }),
          ...(spendingPct !== undefined && { spendingPct }),
          ...(savingsPct !== undefined && { savingsPct }),
          ...(investPct !== undefined && { investPct }),
          ...(travelPct !== undefined && { travelPct }),
        })
        .where(
          and(
            eq(budgets.userId, userId),
            eq(budgets.month, month),
            eq(budgets.year, year),
          ),
        )
        .returning();

      return updated!;
    }),
});
