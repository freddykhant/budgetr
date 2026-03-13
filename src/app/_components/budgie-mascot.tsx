"use client";

type BudgieMascotProps = {
  size?: number;
  className?: string;
  animate?: "bob" | "float" | "tilt" | "none";
};

/** Small budgie/parrot mascot for on-theme cuteness. */
export function BudgieMascot({
  size = 32,
  className = "",
  animate = "bob",
}: BudgieMascotProps) {
  const animClass =
    animate === "bob"
      ? "animate-[budgie-bob_2.5s_ease-in-out_infinite]"
      : animate === "float"
        ? "animate-[budgie-float_3s_ease-in-out_infinite]"
        : animate === "tilt"
          ? "animate-[budgie-tilt_2s_ease-in-out_infinite]"
          : "";

  return (
    <span
      className={`inline-block ${animClass} ${className}`}
      role="img"
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* body */}
        <ellipse cx="26" cy="32" rx="10" ry="12" fill="#4ade80" />
        <ellipse cx="26" cy="30" rx="7" ry="9" fill="#86efac" opacity="0.6" />
        {/* head */}
        <circle cx="28" cy="18" r="10" fill="#4ade80" />
        <circle cx="28" cy="17" r="6" fill="#86efac" opacity="0.5" />
        {/* crest */}
        <path
          d="M24 8 Q28 4 32 8"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* beak */}
        <path
          d="M36 18 L42 20 L36 22 Z"
          fill="#fbbf24"
        />
        {/* eye */}
        <circle cx="32" cy="16" r="2" fill="#166534" />
        <circle cx="33" cy="15" r="0.5" fill="white" />
        {/* wing */}
        <ellipse
          cx="20"
          cy="32"
          rx="4"
          ry="8"
          fill="#22c55e"
          opacity="0.8"
          transform="rotate(-15 20 32)"
        />
        {/* tail feather */}
        <path
          d="M16 38 Q8 36 12 42 Q16 40 16 38"
          fill="#16a34a"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
