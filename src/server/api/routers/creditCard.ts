import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { creditCardGoals } from "~/server/db/schema";

export const creditCardRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.creditCardGoals.findMany({
      where: eq(creditCardGoals.userId, ctx.session.user.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        cardName: z.string().min(1).max(255),
        spendTarget: z.number().positive(),
        bonusPoints: z.number().int().min(0).default(0),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { cardName, spendTarget, bonusPoints, startDate } = input;

      // endDate = startDate + 90 days
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 90);
      const endDate = end.toISOString().slice(0, 10);

      const [goal] = await ctx.db
        .insert(creditCardGoals)
        .values({
          userId: ctx.session.user.id,
          cardName,
          spendTarget: spendTarget.toString(),
          bonusPoints,
          startDate,
          endDate,
        })
        .returning();

      return goal!;
    }),

  // Update spend progress or paid-in-full status.
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        currentSpend: z.number().min(0).optional(),
        paidInFull: z.boolean().optional(),
        bonusPoints: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, currentSpend, paidInFull, bonusPoints } = input;

      const [updated] = await ctx.db
        .update(creditCardGoals)
        .set({
          ...(currentSpend !== undefined && { currentSpend: currentSpend.toString() }),
          ...(paidInFull !== undefined && { paidInFull }),
          ...(bonusPoints !== undefined && { bonusPoints }),
        })
        .where(
          and(
            eq(creditCardGoals.id, id),
            eq(creditCardGoals.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(creditCardGoals)
        .where(
          and(
            eq(creditCardGoals.id, input.id),
            eq(creditCardGoals.userId, ctx.session.user.id),
          ),
        );
    }),
});
