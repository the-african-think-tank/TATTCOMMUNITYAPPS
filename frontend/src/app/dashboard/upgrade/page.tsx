"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    CheckCircle,
    Zap,
    Shield,
    Loader2,
} from "lucide-react";
import api from "@/services/api";

import { PricingPlanCard, Plan } from "@/components/molecules/pricing-plan-card";

const TIER_RANK: Record<string, number> = {
    FREE: 0,
    UBUNTU: 1,
    IMANI: 2,
    KIONGOZI: 3,
};

export default function UpgradePage() {
    const { user } = useAuth();
    const router = useRouter();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isYearly, setIsYearly] = useState(false);

    // Kiongozi members have nothing to upgrade to — send them away
    useEffect(() => {
        if (user?.communityTier === "KIONGOZI") {
            router.replace("/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const resp = await api.get("/billing/plans");
                setPlans(resp.data);
            } catch (err) {
                console.error("Failed to fetch plans", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlans();
    }, []);

    if (!user || user.communityTier === "KIONGOZI") return null;

    const currentRank = TIER_RANK[user.communityTier ?? "FREE"] ?? 0;

    const handleSelectPlan = (plan: Plan) => {
        if (plan.monthlyPrice === 0) return; // FREE — no action
        router.push(`/dashboard/upgrade/payment?plan=${plan.tier}&yearly=${isYearly}`);
    };

    const fmt = (n: number) => {
        const rounded = Math.round(n * 100) / 100;
        return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Hero banner */}
            <div className="bg-tatt-black relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            "radial-gradient(var(--tatt-lime) 0.5px, transparent 0.5px), radial-gradient(var(--tatt-lime) 0.5px, transparent 0.5px)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 10px 10px",
                    }}
                />
                <div className="relative z-10 max-w-4xl mx-auto px-6 py-14 text-center">
                    <div className="inline-flex items-center gap-2 bg-tatt-lime/10 border border-tatt-lime/20 text-tatt-lime text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                        <Zap className="h-3 w-3" />
                        Membership Upgrade
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                        Unlock Your Full <span className="text-tatt-lime">TATT-U Potential</span>
                    </h1>
                    <p className="text-white/60 text-base font-medium max-w-xl mx-auto">
                        Join thousands of African diaspora leaders who use TATT-U's paid tiers to connect, collaborate, and drive measurable impact.
                    </p>

                    <div className="mt-7 inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full">
                        <Shield className="h-3.5 w-3.5" />
                        Current tier: {user.communityTier ?? "FREE"}
                    </div>

                    <div className="flex items-center justify-center mt-8 gap-4">
                        <span className={`text-sm font-bold transition-colors ${!isYearly ? "text-white" : "text-white/40"}`}>Monthly</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isYearly}
                                onChange={() => setIsYearly(!isYearly)}
                            />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tatt-lime" />
                        </label>
                        <span className={`text-sm font-bold transition-colors ${isYearly ? "text-white" : "text-white/40"}`}>
                            Yearly{" "}
                            <span className="text-tatt-lime bg-tatt-lime/10 border border-tatt-lime/20 px-2 py-0.5 rounded-full text-xs ml-1">
                                Unlocked Discounts
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="h-10 w-10 text-tatt-lime animate-spin mb-4" />
                        <p className="text-tatt-gray font-bold">Loading membership plans...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
                            {plans.map((plan) => {
                                const planRank = TIER_RANK[plan.tier] ?? 0;
                                const isCurrentPlan = user.communityTier === plan.tier;
                                const isDowngrade = planRank < currentRank;

                                return (
                                    <PricingPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        isYearly={isYearly}
                                        isCurrentPlan={isCurrentPlan}
                                        isDowngrade={isDowngrade}
                                        onSelect={(p) => handleSelectPlan(p)}
                                        ctaLabel={plan.tier === "KIONGOZI" ? "Upgrade to Kiongozi" : `Upgrade to ${plan.name}`}
                                        pulsePopular={false}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: Shield, title: "Secure Payments", desc: "Powered by Stripe — PCI DSS compliant" },
                                { icon: Zap, title: "Instant Activation", desc: "Your tier upgrades immediately on payment" },
                                { icon: CheckCircle, title: "Cancel Anytime", desc: "No lock-ins. Manage your plan from Settings" },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-tatt-lime/10 flex items-center justify-center shrink-0">
                                            <Icon className="h-5 w-5 text-tatt-lime-dark" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-foreground">{item.title}</p>
                                            <p className="text-xs text-tatt-gray font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
