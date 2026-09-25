"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/components/atoms/auth-button";
import { JoinAsSelector } from "@/components/molecules/join-as-selector";
import { SignupField } from "@/components/molecules/signup-field";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { useHibpCheck } from "@/hooks/use-hibp-check";
import { TermsModal } from "@/components/shared/terms-modal";
import { analytics } from "@/lib/analytics";

// ─── Password validation rules ───────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: "length",    label: "At least 8 characters",         test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "At least one lowercase letter",  test: (p: string) => /[a-z]/.test(p) },
  { id: "number",    label: "At least one number",            test: (p: string) => /\d/.test(p) },
  { id: "special",   label: "At least one special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "text-transparent", barColor: "bg-transparent" };
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Very Weak",   color: "text-red-500",    barColor: "bg-red-500" };
  if (passed === 2) return { score: 2, label: "Weak",       color: "text-orange-500", barColor: "bg-orange-400" };
  if (passed === 3) return { score: 3, label: "Fair",       color: "text-yellow-500", barColor: "bg-yellow-400" };
  if (passed === 4) return { score: 4, label: "Strong",     color: "text-tatt-lime",  barColor: "bg-tatt-lime" };
  return             { score: 5, label: "Very Strong", color: "text-green-600",  barColor: "bg-green-500" };
}

// ─── Password strength meter component ───────────────────────────────────────
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= strength.score ? strength.barColor : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wide shrink-0 ${strength.color}`}>
          {strength.label}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-0.5">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                passed ? "text-green-600" : "text-gray-400"
              }`}
            >
              {passed
                ? <CheckCircle className="size-3 shrink-0" />
                : <XCircle className="size-3 shrink-0" />
              }
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── HIBP Status banner component ────────────────────────────────────────────
function HibpBanner({ status, count }: { status: string; count: number }) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-[11px] text-gray-500 font-medium">
        <Loader2 className="size-3 animate-spin shrink-0" />
        Checking password against known data breaches…
      </div>
    );
  }

  if (status === "pwned") {
    const formattedCount = count.toLocaleString();
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-3 space-y-1">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="text-[12px] font-black uppercase tracking-wide">
            Password Found in Data Breaches
          </span>
        </div>
        <p className="text-[11px] text-red-600 leading-relaxed">
          This password has appeared in{" "}
          <span className="font-bold">{formattedCount} known data breach{count === 1 ? "" : "es"}</span>{" "}
          and is commonly exploited by attackers. Please choose a different, unique password
          that you have not used on any other site.
        </p>
        <a
          href="https://haveibeenpwned.com/Passwords"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-red-500 underline hover:text-red-700 transition-colors"
        >
          Learn more about Have I Been Pwned →
        </a>
      </div>
    );
  }

  if (status === "safe") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-[11px] text-green-700 font-medium">
        <ShieldCheck className="size-3.5 shrink-0" />
        Password not found in any known data breach. ✓
      </div>
    );
  }

  // "error" or "idle" — render nothing
  return null;
}

// ─── Zod schema ──────────────────────────────────────────────────────────────
const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name is too long")
    .regex(/^[A-Za-z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address (e.g. you@example.com)")
    .max(100, "Email address is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
  joinAs: z.enum(["MEMBER", "VOLUNTEER"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

// ─── Main component ───────────────────────────────────────────────────────────
export function SignupForm() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // HIBP breach check
  const hibp = useHibpCheck();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { joinAs: "MEMBER" },
  });

  const passwordValue = watch("password") || "";

  // Trigger HIBP check whenever the password field changes
  useEffect(() => {
    hibp.check(passwordValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordValue]);

  const onSubmit = async (data: SignupFormData) => {
    // Block submission if ToS not agreed
    if (!termsAgreed) {
      toast.error("Please read and agree to the Terms of Service to continue.");
      return;
    }

    // Warn (soft-block) if the password is known to be pwned
    if (hibp.status === "pwned") {
      toast.error(
        "Your password has been found in a data breach. Please choose a different password before continuing.",
        { duration: 5000 }
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/signup/community", {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        communityTier: "FREE",
      });

      if (response.data.message) {
        toast.success(response.data.message);
      }

      if (response.data.access_token) {
        analytics.trackSignUp({
          method: "email",
          joinAs: data.joinAs,
          tier: "FREE",
        });
        authLogin(response.data.access_token, response.data.user);
        router.push("/onboarding/plans");
      }

    } catch (err: any) {
      console.error("Signup error:", err);
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 409) {
        setError(
          <div className="flex flex-col gap-1">
            <p className="font-bold">{msg || "This email is already registered."}</p>
            <p>If you haven&apos;t finished setting up your account, <a href="/" className="underline font-black hover:text-red-900 transition-colors">Login here to resume your onboarding →</a></p>
          </div>
        );
      } else {
        const errorMsg = Array.isArray(msg) ? msg[0] : msg || "Something went wrong. Please try again.";
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <section className="w-full max-w-[448px]">
      <header className="space-y-2">
        <h1 className="text-[28px] xs:text-[32px] sm:text-[42px] font-black leading-[1.2] tracking-[-0.75px] text-tatt-black">
          Create Your Account
        </h1>
        <p className="text-xs sm:text-base leading-6 text-tatt-gray">
          Step into a world of collective intelligence and impact.
        </p>
      </header>


      {error && (
        <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="mt-10 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="joinAs"
          control={control}
          render={({ field }) => (
            <JoinAsSelector value={field.value} onChange={field.onChange} />
          )}
        />

        <div className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SignupField
              id="firstName"
              label="First Name"
              placeholder="e.g. Your first name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <SignupField
              id="lastName"
              label="Last Name"
              placeholder="e.g. Your last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register("lastName")}
            />
          </div>

          {/* Email */}
          <SignupField
            id="email"
            label="Email Address"
            placeholder="your.email@example.com"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          {/* Password with strength meter + HIBP check */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium leading-5 text-tatt-black">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 pr-11 text-sm placeholder:text-gray-400 focus:border-tatt-lime focus:outline-none focus:ring-2 focus:ring-tatt-lime/20 transition-all"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-tatt-black transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}

            {/* Strength meter */}
            <PasswordStrengthMeter password={passwordValue} />

            {/* HIBP breach check banner */}
            {passwordValue.length >= 8 && (
              <HibpBanner status={hibp.status} count={hibp.count} />
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium leading-5 text-tatt-black">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 pr-11 text-sm placeholder:text-gray-400 focus:border-tatt-lime focus:outline-none focus:ring-2 focus:ring-tatt-lime/20 transition-all"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-tatt-black transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {/* Terms & Privacy */}
        <div className="py-2">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setTermsAgreed(!termsAgreed)}
              aria-label={termsAgreed ? "Uncheck terms agreement" : "Agree to terms"}
              className={`mt-0.5 size-4 rounded-[4px] border shrink-0 flex items-center justify-center transition-colors ${
                termsAgreed
                  ? "bg-tatt-lime border-tatt-lime"
                  : "bg-surface border-border hover:border-tatt-lime/60"
              }`}
            >
              {termsAgreed && <CheckCircle className="size-3 text-tatt-black" />}
            </button>
            <span className="text-sm leading-5 text-tatt-gray">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setTermsModalOpen(true)}
                className="font-semibold text-tatt-lime underline decoration-tatt-lime hover:opacity-80 transition-opacity"
              >
                Terms of Service
              </button>
              {" "}and{" "}
              <a
                href="https://www.theafricanthinktank.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-tatt-black underline decoration-tatt-lime hover:opacity-80 transition-opacity"
              >
                Privacy Policy
              </a>
              .
            </span>
          </div>
        </div>

        <TermsModal
          open={termsModalOpen}
          onClose={() => setTermsModalOpen(false)}
          requireAgreement={true}
          onAgree={() => setTermsAgreed(true)}
        />

        <AuthButton
          disabled={isLoading || hibp.status === "checking"}
          className="shadow-[0_10px_15px_-3px_rgba(159,204,0,0.2),0_4px_6px_-4px_rgba(159,204,0,0.2)]"
        >
          {isLoading
            ? "CREATING ACCOUNT..."
            : hibp.status === "checking"
            ? "CHECKING PASSWORD..."
            : "CREATE ACCOUNT"}
        </AuthButton>

        <p className="text-center text-sm text-tatt-gray">
          Already have an account?{" "}
          <a href="/" className="font-bold text-tatt-black hover:underline decoration-tatt-lime">
            Log in here
          </a>
        </p>
      </form>

      <div className="mt-10 border-t border-[#f5f5f0] pt-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-tatt-gray mb-6">
          In partnership with
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="h-4 w-16 sm:h-6 sm:w-20 rounded-[2px] bg-tatt-black" />
          <span className="h-4 w-12 sm:h-6 sm:w-16 rounded-[2px] bg-tatt-black" />
          <span className="h-4 w-20 sm:h-6 sm:w-24 rounded-[2px] bg-tatt-black" />
        </div>
      </div>

    </section>
  );
}
