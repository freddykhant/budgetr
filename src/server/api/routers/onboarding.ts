import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  budgetAllocations,
  budgets,
  categories,
  userSettings,
} from "~/server/db/schema";

const categoryTypeSchema = z.enum([
  "spending",
  "saving",
  "investment",
  "credit_card",
  "custom",
]);

export const onboardingRouter = createTRPCRouter({
  complete: protectedProcedure
    .input(
      z.object({
        income: z.number().positive(),
        month: z.number().min(1).max(12),
        year: z.number(),
        categories: z.array(
          z.object({
            name: z.string().min(1).max(255),
            emoji: z.string().max(16).optional(),
            color: z.string().max(32).optional(),
            type: categoryTypeSchema,
            allocationPct: z.number().min(0).max(100),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const totalPct = input.categories.reduce(
        (sum, c) => sum + c.allocationPct,
        0,
      );

      if (totalPct !== 100) {
        throw new Error("Allocation percentages must add up to 100%");
      }

      // NOTE: neon-http driver doesn't support transactional APIs the same
      // way as some other drivers, so we perform these operations
      // sequentially instead of using `db.transaction`.

      // Upsert user settings
      const existingSettings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      if (existingSettings) {
        await ctx.db
          .update(userSettings)
          .set({
            monthlyIncome: input.income.toString(),
            onboardingCompleted: true,
          })
          .where(eq(userSettings.id, existingSettings.id));
      } else {
        await ctx.db.insert(userSettings).values({
          userId,
          monthlyIncome: input.income.toString(),
          onboardingCompleted: true,
        });
      }

      // Create categories
      const createdCategories = await ctx.db
        .insert(categories)
        .values(
          input.categories.map((c, index) => ({
            userId,
            name: c.name,
            emoji: c.emoji,
            color: c.color,
            type: c.type,
            sortOrder: index,
          })),
        )
        .returning();

      // Create first budget
      const budgetArr = await ctx.db
        .insert(budgets)
        .values({
          userId,
          month: input.month,
          year: input.year,
          income: input.income.toString(),
        })
        .returning();
      const budget = budgetArr[0];

      if (!budget) {
        throw new Error("Failed to create budget");
      }

      // Link allocations
      await ctx.db.insert(budgetAllocations).values(
        createdCategories.map((cat, index) => ({
          budgetId: budget.id,
          categoryId: cat.id,
          allocationPct: input.categories[index]!.allocationPct,
        })),
      );

      return {
        budget,
        categories: createdCategories,
      };
    }),
});

