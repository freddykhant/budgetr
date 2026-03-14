import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { subscriptions } from "~/server/db/schema";

export const subscriptionRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, ctx.session.user.id),
      orderBy: [desc(subscriptions.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        emoji: z.string().max(16).default("💳"),
        amount: z.number().positive(),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
        color: z.string().max(32).default("violet"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(subscriptions)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          emoji: input.emoji,
          amount: input.amount.toString(),
          billingCycle: input.billingCycle,
          color: input.color,
        })
        .returning();
      return created!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        emoji: z.string().max(16).optional(),
        amount: z.number().positive().optional(),
        billingCycle: z.enum(["monthly", "yearly"]).optional(),
        color: z.string().max(32).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const [updated] = await ctx.db
        .update(subscriptions)
        .set({
          ...(fields.name !== undefined && { name: fields.name }),
          ...(fields.emoji !== undefined && { emoji: fields.emoji }),
          ...(fields.amount !== undefined && { amount: fields.amount.toString() }),
          ...(fields.billingCycle !== undefined && { billingCycle: fields.billingCycle }),
          ...(fields.color !== undefined && { color: fields.color }),
          ...(fields.isActive !== undefined && { isActive: fields.isActive }),
        })
        .where(
          and(
            eq(subscriptions.id, id),
            eq(subscriptions.userId, ctx.session.user.id),
          ),
        )
        .returning();
      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.id),
            eq(subscriptions.userId, ctx.session.user.id),
          ),
        );
    }),
});
