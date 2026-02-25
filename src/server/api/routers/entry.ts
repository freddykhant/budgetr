import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { entries } from "~/server/db/schema";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO date (YYYY-MM-DD)");

function extractMonthYear(date: string) {
  const d = new Date(date + "T00:00:00");
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

export const entryRouter = createTRPCRouter({
  // All entries for a category across all months (for goal-progress calculations)
  listAllForCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.entries.findMany({
        where: and(
          eq(entries.userId, ctx.session.user.id),
          eq(entries.categoryId, input.categoryId),
        ),
        orderBy: [desc(entries.date), desc(entries.createdAt)],
      });
    }),

  // All entries for multiple categories across all months
  listForCategories: protectedProcedure
    .input(z.object({ categoryIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (input.categoryIds.length === 0) return [];
      return ctx.db.query.entries.findMany({
        where: and(
          eq(entries.userId, ctx.session.user.id),
          inArray(entries.categoryId, input.categoryIds),
        ),
        orderBy: [desc(entries.date), desc(entries.createdAt)],
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.entries.findMany({
        where: and(
          eq(entries.userId, ctx.session.user.id),
          eq(entries.categoryId, input.categoryId),
          eq(entries.month, input.month),
          eq(entries.year, input.year),
        ),
        orderBy: [desc(entries.date), desc(entries.createdAt)],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        amount: z.number().positive(),
        date: dateString,
        description: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { month, year } = extractMonthYear(input.date);

      const [created] = await ctx.db
        .insert(entries)
        .values({
          userId: ctx.session.user.id,
          categoryId: input.categoryId,
          amount: input.amount.toString(),
          description: input.description,
          date: input.date,
          month,
          year,
        })
        .returning();

      return created!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.number().positive().optional(),
        date: dateString.optional(),
        description: z.string().max(255).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Partial<typeof entries.$inferInsert> = {};

      if (input.amount !== undefined) {
        updates.amount = input.amount.toString();
      }

      if (input.date !== undefined) {
        const { month, year } = extractMonthYear(input.date);
        updates.date = input.date;
        updates.month = month;
        updates.year = year;
      }

      if (input.description !== undefined) {
        updates.description = input.description ?? undefined;
      }

      const [updated] = await ctx.db
        .update(entries)
        .set(updates)
        .where(
          and(
            eq(entries.id, input.id),
            eq(entries.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(entries)
        .where(
          and(
            eq(entries.id, input.id),
            eq(entries.userId, ctx.session.user.id),
          ),
        );
    }),
});

