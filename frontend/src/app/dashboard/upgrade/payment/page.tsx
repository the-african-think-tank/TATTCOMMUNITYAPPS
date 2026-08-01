"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    CreditCard,
    Lock,
    ArrowLeft,
    ShieldCheck,
    CheckCircle,
    Loader2,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";

// Format price cleanly — no floating-point artifacts
const fmt = (n: number) => {
    const rounded = Math.round(n * 100) / 100;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
};

function DashboardPaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, updateUser } = useAuth();

    const planId = searchParams.get("plan") || "IMANI";
    const isYearly = searchParams.get("yearly") === "true";

    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const plansRes = await api.get("/billing/plans");
                setPlans(plansRes.data);
            } catch (err) {
                console.error("Failed to fetch checkout data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const planDetails = useMemo(() => {
        const plan = plans.find((p) => p.tier === planId);
        if (!plan) return { name: planId, price: 0, originalPrice: 0, period: isYearly ? "year" : "mo", features: [], discount: null };
        
        const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        let finalPrice = price;
        if (plan.activeDiscount) {
            finalPrice = plan.activeDiscount.type === 'percentage' 
                ? price * (1 - plan.activeDiscount.value / 100) 
                : Math.max(0, price - plan.activeDiscount.value / 100);
        }

        return {
            name: plan.name,
            price: finalPrice,
            originalPrice: price,
            period: isYearly ? "year" : "mo",
            features: plan.features ?? [],
            discount: plan.activeDiscount
        };
    }, [plans, planId, isYearly]);

    const fetchUpdatedUser = async () => {
        try {
            const { data } = await api.get("/auth/me");
            updateUser(data);
            return data;
        } catch (error) {
            console.error("Failed to fetch updated user:", error);
            throw error;
        }
    };

    const handleCheckoutSuccess = async (sessionId: string) => {
        console.log("✅ Payment successful, session:", sessionId);
        try {
            await fetchUpdatedUser();
        } catch (err) {
            updateUser({ ...user, communityTier: planId });
        }
        router.push(`/onboarding/success?plan=${planId}&session=${sessionId}&tier=${planId}&yearly=${isYearly}&isUpgrade=true`);
    };

    const handleCheckoutError = (err: any) => {
        console.error("Payment error:", err);
        setSubmitError(err?.message || "Payment failed. Please try again.");
        setShowCheckout(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
            {/* Back button */}
            <button
                onClick={() => router.push("/dashboard/upgrade")}
                className="flex items-center gap-2 text-tatt-gray hover:text-tatt-lime transition-colors text-xs font-bold uppercase tracking-widest mb-8 group"
            >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Plans
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* ── Left: Stripe Checkout ── */}
                <div className="lg:col-span-7 space-y-8">
                    <div>
                        <h1 className="text-3xl font-black text-foreground mb-1">Checkout</h1>
                        <p className="text-tatt-gray text-sm">
                            Complete your TATT <strong>{planDetails.name}</strong> subscription upgrade with Stripe.
                        </p>
                    </div>

                    {!showCheckout ? (
                        <div className="space-y-6">
                            {submitError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                                    {submitError}
                                </div>
                            )}

                            <div className="p-6 border-2 border-tatt-lime rounded-2xl bg-tatt-lime/5 shadow-sm space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-black text-xl text-foreground block">TATT {planDetails.name}</span>
                                        <span className="text-xs text-tatt-gray font-medium uppercase tracking-wider">Tier Upgrade</span>
                                    </div>
                                    <span className="text-tatt-lime font-black text-2xl">
                                        ${fmt(planDetails.price)}
                                        <span className="text-sm font-normal text-tatt-gray">
                                            {" "}
                                            / {planDetails.period}
                                        </span>
                                    </span>
                                </div>

                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="w-full bg-tatt-lime hover:brightness-105 text-tatt-black font-black py-4 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-3 group uppercase tracking-widest text-sm"
                                >
                                    <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    Pay with Stripe
                                </button>

                                <p className="text-center text-xs text-tatt-gray flex items-center justify-center gap-1">
                                    <Lock className="h-3.5 w-3.5" />
                                    Encrypted 256-Bit Stripe Payment
                                </p>
                            </div>
                        </div>
                    ) : (
                        <SubscriptionCheckout
                            tier={planId}
                            isYearly={isYearly}
                            amount={Math.round(planDetails.price * 100)}
                            currency="usd"
                            userEmail={user?.email || ""}
                            userId={user?.id || ""}
                            onSuccess={handleCheckoutSuccess}
                            onError={handleCheckoutError}
                        />
                    )}
                </div>

                {/* ── Right: Order Summary ── */}
                <div className="lg:col-span-5">
                    <div className="sticky top-6 space-y-5">
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                            {/* Header strip */}
                            <div className="h-1 bg-tatt-lime w-full" />

                            <div className="p-6 relative">
                                <div className="absolute top-0 right-0 w-28 h-28 bg-tatt-lime/5 rounded-full -mr-12 -mt-12 pointer-events-none" />

                                <h3 className="text-base font-bold text-foreground mb-5">Order Summary</h3>

                                {/* Plan block */}
                                <div className="flex items-start gap-4 mb-5 p-4 bg-tatt-lime/5 border border-tatt-lime/20 rounded-xl">
                                    <div className="size-14 rounded-xl bg-tatt-lime/20 flex items-center justify-center shrink-0">
                                        <CheckCircle className="h-7 w-7 text-tatt-lime" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-foreground">TATT {planDetails.name}</p>
                                        <div className="flex flex-col">
                                            <p className="text-tatt-lime font-bold text-lg mt-0.5">
                                                ${fmt(planDetails.price)}
                                                <span className="text-tatt-gray text-xs font-normal ml-1">/ {planDetails.period}</span>
                                            </p>
                                            {planDetails.discount && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black line-through text-tatt-gray">${fmt(planDetails.originalPrice)}</span>
                                                    <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">-{planDetails.discount.value}{planDetails.discount.type === 'percentage' ? '%' : ' OFF'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => router.push("/dashboard/upgrade")}
                                            className="text-xs font-bold text-tatt-gray hover:text-tatt-lime mt-1 underline underline-offset-4"
                                        >
                                            Change plan
                                        </button>
                                    </div>
                                </div>

                                {/* Features */}
                                {planDetails.features.length > 0 && (
                                    <ul className="space-y-2 mb-5 border-b border-border pb-5">
                                        {planDetails.features.map((feature: string, idx: number) => (
                                            <li key={idx} className="flex items-center gap-2 text-sm text-tatt-gray">
                                                <CheckCircle className="text-tatt-lime h-4 w-4 shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Price breakdown */}
                                <div className="space-y-2 mb-5">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-tatt-gray">Subtotal</span>
                                        <span className="font-medium text-foreground">${fmt(planDetails.price)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-tatt-gray">Tax (0%)</span>
                                        <span className="font-medium text-foreground">$0.00</span>
                                    </div>
                                    <div className="flex justify-between font-black text-lg pt-3 border-t border-border">
                                        <span className="text-foreground">Total Due</span>
                                        <span className="text-foreground">${fmt(planDetails.price)}</span>
                                    </div>
                                </div>

                                {/* Notice */}
                                <div className="p-3 bg-background rounded-xl border border-dashed border-border text-[10px] text-tatt-gray leading-relaxed uppercase tracking-tight">
                                    <span className="font-black text-foreground">Subscription Notice:</span>{" "}
                                    Your membership will automatically renew. Cancel anytime from Settings.
                                </div>
                            </div>
                        </div>

                        {/* Trust signals */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: ShieldCheck, label: "SSL Encrypted" },
                                { icon: Lock, label: "Stripe Secured" },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="flex items-center gap-2 bg-surface border border-border rounded-xl p-3">
                                        <Icon className="h-4 w-4 text-tatt-lime-dark shrink-0" />
                                        <span className="text-xs font-bold text-tatt-gray">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPaymentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
            </div>
        }>
            <DashboardPaymentContent />
        </Suspense>
    );
}

