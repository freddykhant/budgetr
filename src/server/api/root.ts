import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { budgetRouter } from "./routers/budget";
import { categoryRouter } from "./routers/category";
import { creditCardRouter } from "./routers/creditCard";
import { entryRouter } from "./routers/entry";
import { goalRouter } from "./routers/goal";
import { onboardingRouter } from "./routers/onboarding";

export const appRouter = createTRPCRouter({
  budget: budgetRouter,
  category: categoryRouter,
  entry: entryRouter,
  goal: goalRouter,
  creditCard: creditCardRouter,
  
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
