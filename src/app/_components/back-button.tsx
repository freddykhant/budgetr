"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href: string;
  label?: string;
};

export function BackButton({ href, label = "Back" }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-green-200 bg-white text-green-500 shadow-sm shadow-green-900/5 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800 active:scale-95"
    >
      <ArrowLeft
        size={14}
        className="transition-transform duration-150 group-hover:-translate-x-0.5"
      />
    </Link>
  );
}
