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
    <header className="sticky top-0 z-10 border-b border-green-100 bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/budgie_1.png"
            alt="budgie"
            width={36}
            height={36}
            className="rounded-lg shadow-sm shadow-green-900/10"
          />
          <span className="text-xl font-semibold tracking-tight text-green-950">
            budgie
          </span>
        </div>

        {/* User button */}
        <UserButton user={user} />
      </div>
    </header>
  );
}
