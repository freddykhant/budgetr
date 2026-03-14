import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userSettings } from "~/server/db/schema";

export const userSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        paydayOfMonth: z.number().min(1).max(31).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!existing) throw new Error("Settings not found");

      const [updated] = await ctx.db
        .update(userSettings)
        .set({
          ...(input.paydayOfMonth !== undefined && {
            paydayOfMonth: input.paydayOfMonth,
          }),
        })
        .where(eq(userSettings.id, existing.id))
        .returning();

      return updated!;
    }),
});
