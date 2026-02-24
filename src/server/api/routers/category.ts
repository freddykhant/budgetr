import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { categories } from "~/server/db/schema";

const categoryTypeSchema = z.enum([
  "spending",
  "saving",
  "investment",
  "credit_card",
  "custom",
]);

export const categoryRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      where: eq(categories.userId, ctx.session.user.id),
      orderBy: [asc(categories.sortOrder), asc(categories.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        emoji: z.string().max(16).optional(),
        color: z.string().max(32).optional(),
        type: categoryTypeSchema.default("spending"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.categories.findMany({
        where: eq(categories.userId, userId),
        columns: { id: true },
      });

      const sortOrder = existing.length;

      const [created] = await ctx.db
        .insert(categories)
        .values({
          userId,
          name: input.name,
          emoji: input.emoji,
          color: input.color,
          type: input.type,
          sortOrder,
        })
        .returning();

      return created!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        emoji: z.string().max(16).nullable().optional(),
        color: z.string().max(32).nullable().optional(),
        type: categoryTypeSchema.optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, emoji, color, type, sortOrder } = input;

      const [updated] = await ctx.db
        .update(categories)
        .set({
          ...(name !== undefined && { name }),
          ...(emoji !== undefined && { emoji }),
          ...(color !== undefined && { color }),
          ...(type !== undefined && { type }),
          ...(sortOrder !== undefined && { sortOrder }),
        })
        .where(
          and(
            eq(categories.id, id),
            eq(categories.userId, ctx.session.user.id),
          ),
        )
        .returning();

      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(categories)
        .where(
          and(
            eq(categories.id, input.id),
            eq(categories.userId, ctx.session.user.id),
          ),
        );
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // naive but fine for small lists
      for (const item of input.items) {
        await ctx.db
          .update(categories)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(eq(categories.id, item.id), eq(categories.userId, userId)),
          );
      }
    }),
});

