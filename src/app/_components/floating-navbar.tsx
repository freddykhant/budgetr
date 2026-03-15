"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function FloatingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-5 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ${
        scrolled ? "scale-[0.98]" : "scale-100"
      }`}
    >
      <div
        className={`flex items-center gap-5 rounded-2xl border px-5 py-3 backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? "border-green-200/90 bg-white/95 shadow-lg shadow-green-900/8"
            : "border-green-200/50 bg-white/60 shadow-md shadow-green-900/5"
        }`}
      >
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

        <div className="h-4 w-px bg-green-200" />

        <div className="hidden items-center gap-4 sm:flex">
          {[
            { label: "how it works", href: "#how" },
            { label: "features", href: "#features" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-green-700 transition-colors hover:text-green-950"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden h-4 w-px bg-green-200 sm:block" />

        <a
          href="#signin"
          className="rounded-xl bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-500 hover:shadow-md hover:shadow-green-500/25"
        >
          sign in
        </a>
      </div>
    </nav>
  );
}
