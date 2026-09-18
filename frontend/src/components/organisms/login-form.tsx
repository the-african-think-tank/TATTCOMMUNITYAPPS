"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/components/atoms/auth-button";
import { LoginField } from "@/components/molecules/login-field";
import { RememberForgotRow } from "@/components/molecules/remember-forgot-row";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address (e.g. you@example.com)"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login: authLogin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // validate on blur for a better UX
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/signin", data);

      if (response.data.access_token) {
        authLogin(response.data.access_token, response.data.user);

        // IMPORTANT: Use router.push (client-side nav), NOT window.location.href.
        // window.location.href triggers a full page reload which resets the JS module
        // scope, wiping the in-memory token — causing an instant redirect back to login.
        const systemRole = response.data.user.systemRole;
        if (systemRole && systemRole !== "COMMUNITY_MEMBER") {
          router.push("/admin");
        } else if (!response.data.user.flags?.includes("ONBOARDING_COMPLETED")) {
          // If they haven't finished the onboarding selection yet,
          // redirect to the plans page instead of the dashboard.
          router.push("/onboarding/plans");

        } else {
          router.push("/dashboard");
        }


      } else if (response.data.requiresTwoFactor) {
        setError("Two-factor authentication required. (2FA UI not yet implemented)");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full max-w-[448px]">
      <header className="space-y-2">
        <h1 className="text-[32px] sm:text-[42px] font-black leading-[1.2] tracking-[-0.75px] text-tatt-black">
          Welcome to TATT-U
        </h1>
        <p className="text-sm sm:text-base leading-6 text-tatt-gray">
          Please enter your details to access the TATT-U member portal.
        </p>
      </header>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="mt-10 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <LoginField
          id="email"
          label="Email Address"
          placeholder="your.email@example.com"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />
        <LoginField
          id="password"
          label="Password"
          placeholder="Enter your password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-tatt-gray hover:text-tatt-black transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register("password")}
        />

        <RememberForgotRow />
        <AuthButton disabled={isLoading}>
          {isLoading ? "SIGNING IN..." : "SIGN IN"}
        </AuthButton>
      </form>

      <div className="mt-6 space-y-6 text-center">
        <div className="relative flex h-6 items-center justify-center">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          <span className="relative bg-white px-6 text-sm font-medium leading-6 text-tatt-gray">
            New to the community?
          </span>
        </div>
        <p className="text-sm leading-5 text-tatt-gray">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-bold leading-6 text-tatt-black underline decoration-tatt-lime">
            Request Access / Sign Up
          </a>
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 pt-2">
        <ShieldCheck className="h-4 w-4 text-tatt-lime" aria-hidden="true" />
        <p className="text-center text-xs font-bold uppercase tracking-[1.2px] text-tatt-gray">
          Secure TATT-U Member Portal
        </p>
      </div>
    </section>
  );
}
