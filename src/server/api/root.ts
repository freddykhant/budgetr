import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { budgetRouter } from "./routers/budget";
import { creditCardRouter } from "./routers/creditCard";
import { investmentRouter } from "./routers/investment";
import { savingsRouter } from "./routers/savings";
import { transactionRouter } from "./routers/transaction";
import { travelFundRouter } from "./routers/travelFund";

export const appRouter = createTRPCRouter({
  budget: budgetRouter,
  transaction: transactionRouter,
  savings: savingsRouter,
  investment: investmentRouter,
  travelFund: travelFundRouter,
  creditCard: creditCardRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
