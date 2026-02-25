import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { categoryGoals } from "~/server/db/schema";

export const goalRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categoryGoals.findMany({
      where: eq(categoryGoals.userId, ctx.session.user.id),
    });
  }),

  get: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.categoryGoals.findFirst({
        where: and(
          eq(categoryGoals.categoryId, input.categoryId),
          eq(categoryGoals.userId, ctx.session.user.id),
        ),
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1).max(255),
        targetAmount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [upserted] = await ctx.db
        .insert(categoryGoals)
        .values({
          userId: ctx.session.user.id,
          categoryId: input.categoryId,
          name: input.name,
          targetAmount: input.targetAmount.toString(),
        })
        .onConflictDoUpdate({
          target: [categoryGoals.categoryId],
          set: {
            name: input.name,
            targetAmount: input.targetAmount.toString(),
          },
        })
        .returning();

      return upserted!;
    }),

  delete: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(categoryGoals)
        .where(
          and(
            eq(categoryGoals.categoryId, input.categoryId),
            eq(categoryGoals.userId, ctx.session.user.id),
          ),
        );
    }),
});

