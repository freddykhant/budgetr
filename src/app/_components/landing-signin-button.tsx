"use client";

import { signIn } from "next-auth/react";

function GoogleGlyph() {
  return (
    <span className="flex size-4 items-center justify-center rounded-[4px] bg-green-600">
      <span className="text-[10px] font-semibold text-white">G</span>
    </span>
  );
}

export function LandingSignInButton() {
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl: "/home" })}
      className="group flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-base font-medium text-green-900 shadow-lg shadow-green-800/25 transition-all duration-200 hover:bg-green-50 hover:shadow-green-800/35"
    >
      <GoogleGlyph />
      continue with google
    </button>
  );
}

