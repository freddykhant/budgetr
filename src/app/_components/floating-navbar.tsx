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
            : "border-white/10 bg-white/5 shadow-md shadow-black/10"
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
          <span
            className={`text-sm font-semibold tracking-tight transition-colors duration-500 ${
              scrolled ? "text-green-950" : "text-white"
            }`}
          >
            budgie
          </span>
        </a>

        <div
          className={`h-4 w-px transition-colors duration-500 ${
            scrolled ? "bg-green-200" : "bg-white/15"
          }`}
        />

        <div className="hidden items-center gap-4 sm:flex">
          {[
            { label: "how it works", href: "#how" },
            { label: "features", href: "#features" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                scrolled
                  ? "text-green-700 hover:text-green-950"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <div
          className={`hidden h-4 w-px sm:block transition-colors duration-500 ${
            scrolled ? "bg-green-200" : "bg-white/15"
          }`}
        />

        <a
          href="#signin"
          className="rounded-xl bg-green-500 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-green-400 hover:shadow-md hover:shadow-green-500/25"
        >
          sign in
        </a>
      </div>
    </nav>
  );
}
