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
    <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/budgetr.svg"
            alt="budgetr"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="text-lg font-semibold tracking-tight text-white">
            budgetr
          </span>
        </div>

        {/* User button */}
        <UserButton user={user} />
      </div>
    </header>
  );
}
