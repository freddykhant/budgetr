import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { savingsContributions, savingsGoals } from "~/server/db/schema";

export const savingsRouter = createTRPCRouter({
  // Get all savings goals with their full contribution history.
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.savingsGoals.findMany({
      where: eq(savingsGoals.userId, ctx.session.user.id),
      with: { contributions: { orderBy: [asc(savingsContributions.year), asc(savingsContributions.month)] } },
    });
  }),

  createGoal: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        targetAmount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [goal] = await ctx.db
        .insert(savingsGoals)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          targetAmount: input.targetAmount.toString(),
        })
        .returning();

      return goal!;
    }),

  deleteGoal: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(savingsGoals)
        .where(
          and(
            eq(savingsGoals.id, input.id),
            eq(savingsGoals.userId, ctx.session.user.id),
          ),
        );
    }),

  // Upsert the monthly contribution for a goal. One entry per goal/month/year.
  upsertContribution: protectedProcedure
    .input(
      z.object({
        goalId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
        amount: z.number().min(0),
        grewByHundred: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { goalId, month, year, amount, grewByHundred } = input;

      const [upserted] = await ctx.db
        .insert(savingsContributions)
        .values({
          goalId,
          userId: ctx.session.user.id,
          month,
          year,
          amount: amount.toString(),
          grewByHundred,
        })
        .onConflictDoUpdate({
          target: [
            savingsContributions.goalId,
            savingsContributions.month,
            savingsContributions.year,
          ],
          set: { amount: amount.toString(), grewByHundred },
        })
        .returning();

      return upserted!;
    }),

  // Compute current streak: consecutive months (going back from today) where a contribution exists.
  getStreak: protectedProcedure
    .input(z.object({ goalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const contributions = await ctx.db.query.savingsContributions.findMany({
        where: and(
          eq(savingsContributions.goalId, input.goalId),
          eq(savingsContributions.userId, ctx.session.user.id),
        ),
        orderBy: [asc(savingsContributions.year), asc(savingsContributions.month)],
      });

      if (contributions.length === 0) return 0;

      // Build a Set of "YYYY-MM" strings for quick lookup.
      const contributed = new Set(
        contributions.map((c) => `${c.year}-${String(c.month).padStart(2, "0")}`),
      );

      const now = new Date();
      let streak = 0;
      let checkYear = now.getFullYear();
      let checkMonth = now.getMonth() + 1;

      while (contributed.has(`${checkYear}-${String(checkMonth).padStart(2, "0")}`)) {
        streak++;
        checkMonth--;
        if (checkMonth === 0) {
          checkMonth = 12;
          checkYear--;
        }
      }

      return streak;
    }),
});
