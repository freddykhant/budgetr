import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { travelContributions, travelFunds } from "~/server/db/schema";

export const travelFundRouter = createTRPCRouter({
  // All travel funds with their full contribution history.
  getFunds: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.travelFunds.findMany({
      where: eq(travelFunds.userId, ctx.session.user.id),
      with: {
        contributions: {
          orderBy: [asc(travelContributions.year), asc(travelContributions.month)],
        },
      },
    });
  }),

  createFund: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        targetAmount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [fund] = await ctx.db
        .insert(travelFunds)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          targetAmount: input.targetAmount.toString(),
        })
        .returning();

      return fund!;
    }),

  deleteFund: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(travelFunds)
        .where(
          and(
            eq(travelFunds.id, input.id),
            eq(travelFunds.userId, ctx.session.user.id),
          ),
        );
    }),

  // Upsert the monthly contribution for a travel fund. One entry per fund/month/year.
  upsertContribution: protectedProcedure
    .input(
      z.object({
        fundId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
        amount: z.number().min(0),
        note: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fundId, month, year, amount, note } = input;

      const [upserted] = await ctx.db
        .insert(travelContributions)
        .values({
          fundId,
          userId: ctx.session.user.id,
          month,
          year,
          amount: amount.toString(),
          note,
        })
        .onConflictDoUpdate({
          target: [
            travelContributions.fundId,
            travelContributions.month,
            travelContributions.year,
          ],
          set: {
            amount: amount.toString(),
            ...(note !== undefined && { note }),
          },
        })
        .returning();

      return upserted!;
    }),

  deleteContribution: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(travelContributions)
        .where(
          and(
            eq(travelContributions.id, input.id),
            eq(travelContributions.userId, ctx.session.user.id),
          ),
        );
    }),

  // Calculate months remaining to hit goal based on average monthly contribution.
  monthsToGoal: protectedProcedure
    .input(z.object({ fundId: z.number() }))
    .query(async ({ ctx, input }) => {
      const fund = await ctx.db.query.travelFunds.findFirst({
        where: and(
          eq(travelFunds.id, input.fundId),
          eq(travelFunds.userId, ctx.session.user.id),
        ),
        with: { contributions: true },
      });

      if (!fund) return null;

      const totalSaved = fund.contributions.reduce(
        (sum, c) => sum + parseFloat(c.amount),
        0,
      );
      const target = parseFloat(fund.targetAmount);
      const remaining = target - totalSaved;

      if (remaining <= 0) return 0;
      if (fund.contributions.length === 0) return null;

      const avgMonthly = totalSaved / fund.contributions.length;
      if (avgMonthly <= 0) return null;

      return Math.ceil(remaining / avgMonthly);
    }),
});
