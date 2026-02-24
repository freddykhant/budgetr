"use client";

import { LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { SettingsModal } from "./settings-modal";

interface UserButtonProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserButton({ user }: UserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/10 transition-all hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <span className="text-xs font-semibold text-white">{initials}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1C1C1C] shadow-2xl">
            {/* User info */}
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-700">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {user.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Settings size={15} className="text-neutral-500" strokeWidth={1.5} />
                settings
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut size={15} className="text-neutral-500" strokeWidth={1.5} />
                sign out
              </button>
            </div>
          </div>
        </>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
      />
    </div>
  );
}
