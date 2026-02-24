import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { creditCardTrackers } from "~/server/db/schema";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO date (YYYY-MM-DD)");

export const creditCardRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.creditCardTrackers.findMany({
      where: eq(creditCardTrackers.userId, ctx.session.user.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }),

  get: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.creditCardTrackers.findFirst({
        where: and(
          eq(creditCardTrackers.userId, ctx.session.user.id),
          eq(creditCardTrackers.categoryId, input.categoryId),
        ),
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        cardName: z.string().min(1).max(255),
        spendTarget: z.number().positive(),
        bonusPoints: z.number().int().min(0).default(0),
        startDate: dateString,
        endDate: dateString.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startDate + "T00:00:00");
      let endDate = input.endDate;

      if (!endDate) {
        const end = new Date(start);
        end.setDate(end.getDate() + 90);
        endDate = end.toISOString().slice(0, 10);
      }

      const [tracker] = await ctx.db
        .insert(creditCardTrackers)
        .values({
          userId: ctx.session.user.id,
          categoryId: input.categoryId,
          cardName: input.cardName,
          spendTarget: input.spendTarget.toString(),
          bonusPoints: input.bonusPoints,
          startDate: input.startDate,
          endDate,
        })
        .onConflictDoUpdate({
          target: [creditCardTrackers.categoryId],
          set: {
            cardName: input.cardName,
            spendTarget: input.spendTarget.toString(),
            bonusPoints: input.bonusPoints,
            startDate: input.startDate,
            endDate,
          },
        })
        .returning();

      return tracker!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        paidInFull: z.boolean().optional(),
        bonusPoints: z.number().int().min(0).optional(),
        endDate: dateString.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Partial<typeof creditCardTrackers.$inferInsert> = {};

      if (input.paidInFull !== undefined) {
        updates.paidInFull = input.paidInFull;
      }
      if (input.bonusPoints !== undefined) {
        updates.bonusPoints = input.bonusPoints;
      }
      if (input.endDate !== undefined) {
        updates.endDate = input.endDate;
      }

      const [updated] = await ctx.db
        .update(creditCardTrackers)
        .set(updates)
        .where(
          and(
            eq(creditCardTrackers.id, input.id),
            eq(creditCardTrackers.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(creditCardTrackers)
        .where(
          and(
            eq(creditCardTrackers.id, input.id),
            eq(creditCardTrackers.userId, ctx.session.user.id),
          ),
        );
    }),
});

