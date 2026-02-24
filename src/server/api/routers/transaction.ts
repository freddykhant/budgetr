import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { transactions } from "~/server/db/schema";

const categorySchema = z.enum([
  "food_dining",
  "transport",
  "subscriptions",
  "personal_care",
  "entertainment",
  "shopping",
  "other",
]);

export const transactionRouter = createTRPCRouter({
  // List all transactions for a given month/year, newest first.
  list: protectedProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const { month, year } = input;
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 0).toISOString().slice(0, 10);

      return ctx.db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, ctx.session.user.id),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
        orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        category: categorySchema,
        description: z.string().max(255).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(transactions)
        .values({
          userId: ctx.session.user.id,
          amount: input.amount.toString(),
          category: input.category,
          description: input.description,
          date: input.date,
        })
        .returning();

      return created!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.number().positive().optional(),
        category: categorySchema.optional(),
        description: z.string().max(255).nullable().optional(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, amount, category, description, date } = input;

      const [updated] = await ctx.db
        .update(transactions)
        .set({
          ...(amount !== undefined && { amount: amount.toString() }),
          ...(category !== undefined && { category }),
          ...(description !== undefined && { description }),
          ...(date !== undefined && { date }),
        })
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.userId, ctx.session.user.id),
          ),
        );
    }),
});
