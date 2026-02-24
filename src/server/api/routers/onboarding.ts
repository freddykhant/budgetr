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

      const result = await ctx.db.transaction(async (tx) => {
        // Upsert user settings
        const existingSettings = await tx.query.userSettings.findFirst({
          where: eq(userSettings.userId, userId),
        });

        if (existingSettings) {
          await tx
            .update(userSettings)
            .set({
              monthlyIncome: input.income.toString(),
              onboardingCompleted: true,
            })
            .where(eq(userSettings.id, existingSettings.id));
        } else {
          await tx.insert(userSettings).values({
            userId,
            monthlyIncome: input.income.toString(),
            onboardingCompleted: true,
          });
        }

        // Create categories
        const createdCategories = await tx
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
        const [budget] = await tx
          .insert(budgets)
          .values({
            userId,
            month: input.month,
            year: input.year,
            income: input.income.toString(),
          })
          .returning();

        // Link allocations
        await tx.insert(budgetAllocations).values(
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
      });

      return result;
    }),
});

