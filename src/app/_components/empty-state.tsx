"use client";

import Link from "next/link";

import { BudgieMascot } from "./budgie-mascot";

type ActionProp =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

type EmptyStateProps = {
  mascotSize?: number;
  animate?: "bob" | "float" | "tilt";
  headline: string;
  body?: string;
  action?: ActionProp;
};

const ctaCls =
  "mt-4 inline-flex cursor-pointer items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-600 transition hover:border-green-300 hover:bg-green-100 hover:text-green-800";

/** Shared empty state: mascot + headline + body + optional CTA. */
export function EmptyState({
  mascotSize = 48,
  animate = "bob",
  headline,
  body,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 opacity-60">
        <BudgieMascot size={mascotSize} animate={animate} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-green-950">
        {headline}
      </h3>
      {body && (
        <p className="mt-1 max-w-[260px] text-sm text-green-500">
          {body}
        </p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href} className={ctaCls}>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className={ctaCls}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
