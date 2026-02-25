"use client";

import { signIn } from "next-auth/react";

function GoogleGlyph() {
  return (
    <span className="flex size-4 items-center justify-center rounded-[4px] bg-white">
      <span className="text-[10px] font-semibold text-neutral-900">G</span>
    </span>
  );
}

export function LandingSignInButton() {
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl: "/home" })}
      className="group flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900 px-7 py-3.5 text-base font-medium text-neutral-200 transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
    >
      <GoogleGlyph />
      continue with google
    </button>
  );
}

