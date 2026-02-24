import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { investments } from "~/server/db/schema";

export const investmentRouter = createTRPCRouter({
  // All investment entries for the user, oldest first (for charting).
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.investments.findMany({
      where: eq(investments.userId, ctx.session.user.id),
      orderBy: [asc(investments.year), asc(investments.month)],
    });
  }),

  // Upsert monthly ETF contribution + portfolio snapshot. One entry per user/month/year.
  upsert: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        amount: z.number().min(0),
        portfolioValue: z.number().min(0).optional(),
        note: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { month, year, amount, portfolioValue, note } = input;

      const [upserted] = await ctx.db
        .insert(investments)
        .values({
          userId: ctx.session.user.id,
          month,
          year,
          amount: amount.toString(),
          portfolioValue: portfolioValue?.toString(),
          note,
        })
        .onConflictDoUpdate({
          target: [investments.userId, investments.month, investments.year],
          set: {
            amount: amount.toString(),
            ...(portfolioValue !== undefined && { portfolioValue: portfolioValue.toString() }),
            ...(note !== undefined && { note }),
          },
        })
        .returning();

      return upserted!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(investments)
        .where(
          and(
            eq(investments.id, input.id),
            eq(investments.userId, ctx.session.user.id),
          ),
        );
    }),
});
