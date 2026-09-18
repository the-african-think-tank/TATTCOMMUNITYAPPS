"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Shield, Lock, Eye, EyeOff, CheckCircle, 
  ArrowRight, AlertTriangle, ShieldCheck, Loader2, XCircle 
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "react-hot-toast";
import { useHibpCheck } from "@/hooks/use-hibp-check";

interface PasswordPolicy {
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
}

// ─── Default rules (fallback) ───
const DEFAULT_POLICY: PasswordPolicy = {
  passwordMinLength: 8,
  passwordMaxLength: 128,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
};

function CompleteRegistrationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { login } = useAuth();
    const hibp = useHibpCheck();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

    // ─── Fetch Policy ───
    useEffect(() => {
      const fetchPolicy = async () => {
        try {
          const { data } = await api.get("/auth/password-policy");
          setPolicy(data);
        } catch (err) {
          console.error("Failed to fetch password policy, using defaults", err);
          setPolicy(DEFAULT_POLICY);
        }
      };
      fetchPolicy();
    }, []);

    // ─── HIBP Check ───
    useEffect(() => {
      hibp.check(password);
    }, [password, hibp]);

    useEffect(() => {
        if (!token) {
            toast.error("Invalid registration link. Missing token.");
        }
    }, [token]);

    const activePolicy = policy || DEFAULT_POLICY;

    const dynamicRules = useMemo(() => [
      { id: "length",    label: `At least ${activePolicy.passwordMinLength} characters`, test: (p: string) => p.length >= activePolicy.passwordMinLength },
      { id: "uppercase", label: "One uppercase letter",  test: (p: string) => !activePolicy.passwordRequireUppercase || /[A-Z]/.test(p) },
      { id: "lowercase", label: "One lowercase letter",  test: (p: string) => !activePolicy.passwordRequireLowercase || /[a-z]/.test(p) },
      { id: "number",    label: "One number",            test: (p: string) => !activePolicy.passwordRequireNumbers || /\d/.test(p) },
      { id: "special",   label: "One special character", test: (p: string) => !activePolicy.passwordRequireSpecialChars || /[^A-Za-z0-9]/.test(p) },
    ], [activePolicy]);

    const strength = useMemo(() => {
      if (!password) return { score: 0, label: "", color: "text-transparent", barColor: "bg-transparent" };
      const passed = dynamicRules.filter((r) => r.test(password)).length;
      if (passed <= 1) return { score: 1, label: "Very Weak",   color: "text-red-500",    barColor: "bg-red-500" };
      if (passed === 2) return { score: 2, label: "Weak",       color: "text-orange-500", barColor: "bg-orange-400" };
      if (passed === 3) return { score: 3, label: "Fair",       color: "text-yellow-500", barColor: "bg-yellow-400" };
      if (passed === 4) return { score: 4, label: "Strong",     color: "text-tatt-lime",  barColor: "bg-tatt-lime" };
      return             { score: 5, label: "Very Strong", color: "text-green-600",  barColor: "bg-green-500" };
    }, [password, dynamicRules]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if matching
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        // Check against policy
        const failedRules = dynamicRules.filter(r => !r.test(password));
        const firstFailed = failedRules[0];
        if (firstFailed) {
            toast.error(`Password fails requirements: ${firstFailed.label}`);
            return;
        }

        // Check HIBP
        if (hibp.status === "pwned") {
            toast.error("This password has been found in a data breach. Please choose a different one.", { duration: 5000 });
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("/auth/org-member/complete-registration", {
                token,
                password
            });

            toast.success("Account activated successfully!");
            
            // Login immediately
            if (response.data.access_token) {
                login(response.data.access_token, response.data.user);
                setSuccess(true);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to complete registration");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md text-center space-y-8 animate-in zoom-in duration-700">
                <div className="size-24 bg-tatt-lime/10 text-tatt-lime rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-tatt-lime/5">
                    <CheckCircle size={48} className="animate-in slide-in-from-bottom duration-1000 fill-tatt-lime/20" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black text-foreground italic uppercase tracking-tighter">Welcome to TATT-U</h1>
                  <p className="text-tatt-gray font-medium leading-relaxed">
                    Your account has been verified and activated. You now have full administrative access to the platform management dashboard.
                  </p>
                </div>
                <div className="pt-4">
                    <button 
                      onClick={() => router.push("/admin")}
                      className="group w-full h-16 bg-tatt-black text-white font-black rounded-2xl shadow-xl hover:bg-tatt-lime hover:text-tatt-black transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs"
                    >
                        Enter Admin Dashboard
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[448px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="space-y-4 mb-10 text-center">
                <div className="size-16 bg-tatt-lime/10 text-tatt-lime rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Shield size={32} />
                </div>
                <h1 className="text-[42px] font-black leading-tight tracking-tight text-foreground italic uppercase">
                    Secure Onboarding
                </h1>
                <p className="text-tatt-gray text-lg font-medium">
                    Finalize your credentials to join our board.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-tatt-gray uppercase tracking-[0.2em] ml-1">Establish Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-5 group-focus-within:text-tatt-lime transition-colors" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="At least 8 characters"
                            className="w-full h-16 pl-12 pr-12 rounded-2xl border border-border bg-surface focus:ring-2 focus:ring-tatt-lime/10 focus:border-tatt-lime outline-none transition-all font-bold text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-tatt-gray hover:text-tatt-lime transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Strength meter */}
                    {password && (
                      <div className="px-1 space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength.score ? strength.barColor : "bg-gray-200"
                              }`}
                            />
                          ))}
                          <span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${strength.color}`}>
                            {strength.label}
                          </span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                          {dynamicRules.map((rule) => {
                            const passed = rule.test(password);
                            return (
                              <li key={rule.id} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tight transition-colors ${passed ? "text-green-600" : "text-tatt-gray/40"}`}>
                                {passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {rule.label}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* HIBP Banner */}
                    {password.length >= 8 && (
                      <div className="animate-in slide-in-from-top duration-500">
                        {hibp.status === "checking" && (
                          <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-4 py-3 text-[10px] text-tatt-gray font-black uppercase tracking-widest">
                            <Loader2 className="size-3.5 animate-spin" /> Checking breach database...
                          </div>
                        )}
                        {hibp.status === "pwned" && (
                          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="size-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Breach Detected</span>
                            </div>
                            <p className="text-[11px] text-red-600 font-medium">
                              This password appeared in <span className="font-bold">{hibp.count.toLocaleString()}</span> data breaches. Select a unique credential for security.
                            </p>
                          </div>
                        )}
                        {hibp.status === "safe" && (
                          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[10px] text-green-700 font-black uppercase tracking-widest">
                            <ShieldCheck className="size-4" /> Secure Credential Verified ✓
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-tatt-gray uppercase tracking-[0.2em] ml-1">Confirm Identity</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-5 group-focus-within:text-tatt-lime transition-colors" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Re-type your password"
                            className="w-full h-16 pl-12 pr-12 rounded-2xl border border-border bg-surface focus:ring-2 focus:ring-tatt-lime/10 focus:border-tatt-lime outline-none transition-all font-bold text-sm"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !token || hibp.status === "checking" || (!!password && hibp.status === "pwned")}
                        className="w-full h-16 bg-tatt-lime text-tatt-black font-black rounded-2xl shadow-xl shadow-tatt-lime/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                Activate My Account
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                    {(!!password && hibp.status === "pwned") && (
                      <p className="text-center text-[10px] font-bold text-red-500 mt-4 uppercase tracking-wider animate-pulse">
                        Security Notice: Change password to proceed
                      </p>
                    )}
                </div>
            </form>

            <footer className="mt-16 pt-8 border-t border-border flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-2 bg-tatt-lime rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-tatt-gray">
                      Board Onboarding Protocol
                  </p>
                </div>
                <p className="text-[9px] text-tatt-gray/40 font-medium">The African Think Tank &bull; Security v2.4</p>
            </footer>
        </div>
    );
}

export default function CompleteRegistrationPage() {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center p-6 py-20">
            <Suspense fallback={
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="size-12 border-4 border-tatt-lime/20 border-t-tatt-lime rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Loading Sector...</p>
              </div>
            }>
                <CompleteRegistrationForm />
            </Suspense>
        </main>
    );
}
