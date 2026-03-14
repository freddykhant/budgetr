"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function FloatingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-5 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ${
        isScrolled ? "scale-[0.98]" : "scale-100"
      }`}
    >
      <div
        className={`flex items-center gap-5 rounded-2xl border px-5 py-3 backdrop-blur-2xl transition-all duration-500 ${
          isScrolled
            ? "border-green-200/90 bg-white/95 shadow-lg shadow-green-900/8"
            : "border-green-200/50 bg-white/75 shadow-md shadow-green-900/5"
        }`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/budgie_1.png"
            alt="budgie"
            width={26}
            height={26}
            className="rounded-lg"
          />
          <span className="text-sm font-semibold tracking-tight text-green-950">
            budgie
          </span>
        </a>

        {/* Divider */}
        <div className="h-4 w-px bg-green-200" />

        {/* Nav links */}
        <div className="hidden items-center gap-4 sm:flex">
          <a
            href="#features"
            className="text-sm text-green-700 transition-colors hover:text-green-950"
          >
            features
          </a>
        </div>

        {/* Divider */}
        <div className="hidden h-4 w-px bg-green-200 sm:block" />

        {/* CTA */}
        <a
          href="#signin"
          className="rounded-xl bg-green-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-600 hover:shadow-md hover:shadow-green-500/25"
        >
          sign in
        </a>
      </div>
    </nav>
  );
}
