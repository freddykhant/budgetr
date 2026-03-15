"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  useCallback,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { authClient } from "~/lib/auth-client";

type Step = "email" | "code";

// ─── Google glyph ─────────────────────────────────────────────────────────────

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Shared card header ────────────────────────────────────────────────────────

function CardHeader({ step }: { step: Step }) {
  return (
    <div className="flex flex-col gap-2 border-b border-green-100/80 px-6 pt-6 pb-5">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
        <Image
          src="/budgie_1.png"
          alt="budgie"
          width={28}
          height={28}
          className="rounded-lg"
          priority
        />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-green-950">
        {step === "email" ? "welcome to budgie" : "check your inbox"}
      </h2>
      <p className="text-sm text-green-700/60">
        {step === "email"
          ? "please sign in or sign up below."
          : "enter the 6-digit code we just sent you."}
      </p>
    </div>
  );
}

// ─── Email step ───────────────────────────────────────────────────────────────

function EmailStep({ onCodeSent }: { onCodeSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to send code. Try again.");
      } else {
        onCodeSent(email.trim().toLowerCase());
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/home",
    });
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-green-900">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            className="h-11 w-full rounded-xl border border-green-200 bg-white px-4 text-sm text-green-950 transition outline-none placeholder:text-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white shadow-sm shadow-green-600/20 transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              Continue with Email
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-green-100" />
        <span className="text-xs text-green-400">or</span>
        <div className="h-px flex-1 bg-green-100" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-800 transition hover:bg-green-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <>
            <GoogleGlyph />
            Sign in with Google
          </>
        )}
      </button>

      <p className="text-center text-xs text-green-400">
        your data stays yours. no ads, no tracking.
      </p>
    </div>
  );
}

// ─── Code step ────────────────────────────────────────────────────────────────

const CODE_LENGTH = 6;

function CodeStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = useCallback((idx: number) => {
    inputRefs.current[Math.min(Math.max(idx, 0), CODE_LENGTH - 1)]?.focus();
  }, []);

  async function verify(code: string) {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp: code });
      if (result.error) {
        setError(result.error.message ?? "Incorrect code. Try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        focusAt(0);
      } else {
        router.push("/home");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(idx: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError("");
    if (char && idx < CODE_LENGTH - 1) focusAt(idx + 1);
    const code = next.join("");
    if (!next.includes("")) void verify(code);
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = "";
        setDigits(next);
      } else if (idx > 0) {
        focusAt(idx - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusAt(idx - 1);
    } else if (e.key === "ArrowRight") {
      focusAt(idx + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("") as string[];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]!;
    setDigits(next);
    setError("");
    focusAt(Math.min(pasted.length, CODE_LENGTH - 1));
    if (pasted.length === CODE_LENGTH) void verify(next.join(""));
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setDigits(Array(CODE_LENGTH).fill(""));
    try {
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      focusAt(0);
    } catch {
      setError("Could not resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <p className="text-sm text-green-700/70">
        sent to <span className="font-medium text-green-900">{email}</span>
      </p>

      {/* OTP boxes */}
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={loading}
            autoFocus={i === 0}
            className="h-12 w-full rounded-xl border border-green-200 bg-white text-center font-mono text-xl font-semibold text-green-950 transition outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50"
          />
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
          <Loader2 size={14} className="animate-spin" />
          verifying…
        </div>
      )}

      {error && <p className="text-center text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between text-xs text-green-400">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer transition hover:text-green-700"
        >
          ← change email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="cursor-pointer transition hover:text-green-700 disabled:opacity-50"
        >
          {resending ? "sending…" : "resend code"}
        </button>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function OtpSignInForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");

  function handleCodeSent(sentEmail: string) {
    setEmail(sentEmail);
    setStep("code");
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl shadow-green-900/8">
      <CardHeader step={step} />
      {step === "email" ? (
        <EmailStep onCodeSent={handleCodeSent} />
      ) : (
        <CodeStep email={email} onBack={() => setStep("email")} />
      )}
    </div>
  );
}
