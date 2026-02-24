"use client";

import type { RouterOutputs } from "~/trpc/react";
import { SpendingCard } from "./spending-card";
import { SavingCard } from "./saving-card";
import { InvestmentCard } from "./investment-card";
import { TravelCard } from "./travel-card";
import { CreditCardTracker } from "./credit-card-tracker";

type Category = RouterOutputs["category"]["list"][number];

type CategoryCardProps = {
  category: Category;
  className?: string;
  // Placeholder props for when this is wired to real data.
  allocationAmount?: number;
};

export function CategoryCard({
  category,
  className,
  allocationAmount = 0,
}: CategoryCardProps) {
  // For now this simply dispatches to the type-specific components
  // with placeholder numbers. When the data layer is wired up, this
  // component will receive real entry aggregates.
  switch (category.type) {
    case "spending":
      return (
        <SpendingCard
          className={className}
          spent={0}
          limit={allocationAmount || 1}
        />
      );
    case "saving":
      return (
        <SavingCard
          className={className}
          name={category.name}
          current={0}
          target={allocationAmount || 1}
          streak={0}
          grewByHundred={false}
        />
      );
    case "investment":
      return (
        <InvestmentCard
          className={className}
          contribution={0}
          allocation={allocationAmount || 1}
          portfolioValue={0}
          previousValue={0}
        />
      );
    case "credit_card":
      return (
        <CreditCardTracker
          className={className}
          cardName={category.name}
          currentSpend={0}
          spendTarget={allocationAmount || 1}
          bonusPoints={0}
          daysLeft={90}
          paidInFull={false}
        />
      );
    case "custom":
    default:
      return (
        <SavingCard
          className={className}
          name={category.name}
          current={0}
          target={allocationAmount || 1}
          streak={0}
          grewByHundred={false}
        />
      );
  }
}

