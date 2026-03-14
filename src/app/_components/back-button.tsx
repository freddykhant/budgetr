"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href: string;
  label?: string;
};

/**
 * Consistent back-navigation pill used across all detail pages.
 * Shows the arrow always; the label fades in on hover via group.
 */
export function BackButton({ href, label = "back" }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-green-200 bg-white pl-2.5 pr-3.5 text-sm font-medium text-green-600 shadow-sm shadow-green-900/5 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 active:scale-95"
    >
      <ArrowLeft
        size={14}
        className="transition-transform duration-150 group-hover:-translate-x-0.5"
      />
      <span>{label}</span>
    </Link>
  );
}
