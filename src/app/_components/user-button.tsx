"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { authClient } from "~/lib/auth-client";

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
        className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30 transition-all hover:ring-white/50 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <span className="text-sm font-semibold text-white">{initials}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl shadow-green-900/10">
            {/* User info */}
            <div className="border-b border-green-100 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-base font-semibold text-green-700">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-green-950">
                    {user.name ?? "User"}
                  </p>
                  <p className="truncate text-sm text-green-600">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-base text-green-700 transition-colors hover:bg-green-50 hover:text-green-950"
              >
                <Settings
                  size={16}
                  className="text-green-500"
                  strokeWidth={1.5}
                />
                settings
              </button>
              <button
                onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-base text-green-700 transition-colors hover:bg-green-50 hover:text-green-950"
              >
                <LogOut
                  size={16}
                  className="text-green-500"
                  strokeWidth={1.5}
                />
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
