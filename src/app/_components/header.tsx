import Image from "next/image";

import { UserButton } from "./user-button";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-green-400/30 bg-linear-to-r from-green-500 to-green-400">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/budgie.svg"
            alt="budgie"
            width={36}
            height={36}
            className="rounded-lg shadow-sm shadow-green-900/20"
          />
          <span className="text-xl font-semibold tracking-tight text-white">
            budgie
          </span>
        </div>

        {/* User button */}
        <UserButton user={user} />
      </div>
    </header>
  );
}
