"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import {
    Check,
    LayoutDashboard,
    Sparkles,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { Footer, Navbar } from "@/components/organisms";
import { useAuth } from "@/context/auth-context";

export function OnboardingSuccessPage() {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // ✅ OPTION A: Get tier from URL parameter (passed from payment page)
    const planId = searchParams.get("tier") || searchParams.get("plan") || "FREE";
    const sessionId = searchParams.get("session") || "";
    const isYearly = searchParams.get("yearly") === "true";
    
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRefreshed, setUserRefreshed] = useState(false);

    // ✅ Fetch the latest user data on mount to ensure auth context is updated
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await api.get("/auth/me");
                updateUser(data);
                setUserRefreshed(true);
                console.log("✅ User refreshed on success page:", data.communityTier);
            } catch (err) {
                console.error("Failed to fetch user on success page:", err);
                setUserRefreshed(true);
            }
        };
        fetchUser();
    }, [updateUser]);

    // Fetch plans for display
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

    const selectedPlan = useMemo(() => {
        return plans.find(p => p.tier === planId);
    }, [plans, planId]);

    const planName = useMemo(() => {
        if (selectedPlan) return selectedPlan.name;
        if (planId === "FREE") return "Free Member";
        return planId.charAt(0) + planId.slice(1).toLowerCase();
    }, [selectedPlan, planId]);

    const benefits = useMemo(() => {
        if (selectedPlan && selectedPlan.features) return selectedPlan.features;
        if (planId === "FREE") return [
            "Access to chapter events",
            "Basic community forums",
            "Newsletter updates",
            "Public profile listing"
        ];
        return [
            "Unlimited connection requests",
            "Access to exclusive workshops",
            "Mentorship program access",
            "Premium resource library",
            "Member directory networking"
        ];
    }, [selectedPlan, planId]);

    // ✅ If still loading, show spinner
    if (isLoading || !userRefreshed) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background text-tatt-black min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-12 bg-pattern">
                <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col md:flex-row border border-border">
                    {/* Left Column: Celebration Content */}
                    <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-border">
                        <div className="mb-8 w-20 h-20 bg-tatt-lime rounded-full flex items-center justify-center shadow-lg shadow-tatt-lime/20 animate-bounce-subtle">
                            <Check className="h-10 w-10 text-tatt-black stroke-[4px]" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight text-foreground">
                            Welcome to the <br />
                            <span className="text-tatt-lime uppercase">TATT Family, {user?.firstName || "Member"}!</span>
                        </h1>
                        <p className="text-tatt-gray text-base sm:text-lg mb-10 max-w-sm">
                            Your <strong>{planName}</strong> subscription is now active. You have been granted full access to your plan's benefits.
                            {sessionId && (
                                <span className="block text-xs text-tatt-gray/50 mt-2 font-mono">
                                    Session: {sessionId.slice(0, 20)}...
                                </span>
                            )}
                        </p>

                        <div className="w-full">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-5 bg-tatt-lime text-tatt-black font-black uppercase tracking-widest text-sm rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-3 shadow-xl shadow-tatt-lime/20 group"
                            >
                                <LayoutDashboard className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                Go to My Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Subscription Summary */}
                    <div className="flex-1 bg-gray-50 p-8 sm:p-12 flex flex-col relative overflow-hidden">
                        {/* Decorative element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-tatt-lime/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                        <h2 className="text-xs font-black text-tatt-gray uppercase tracking-widest mb-8 border-b border-border pb-4">Membership Activation</h2>
                        
                        <div className="bg-white p-5 rounded-2xl mb-10 flex items-center gap-5 shadow-sm border border-border">
                            <div className="size-14 bg-tatt-lime rounded-xl flex items-center justify-center text-tatt-black">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="font-extrabold text-xl text-foreground">{planName}</div>
                                <div className="text-tatt-lime text-xs font-black uppercase tracking-tighter">
                                    {planId === 'FREE' ? 'Free Plan Active' : 'Paid Plan Active'}
                                </div>
                                {isYearly && planId !== 'FREE' && (
                                    <div className="text-[10px] text-tatt-gray font-bold uppercase tracking-wider">
                                        Yearly Billing
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-5 mb-10">
                            <h3 className="text-[10px] font-black text-tatt-gray uppercase tracking-[0.2em] mb-4">Benefits Now Active</h3>
                            {benefits.map((benefit: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 group">
                                    <div className="mt-1 flex-shrink-0 size-5 bg-tatt-lime/20 rounded-full flex items-center justify-center group-hover:bg-tatt-lime/40 transition-colors">
                                        <Check className="h-3 w-3 text-tatt-black stroke-[4px]" />
                                    </div>
                                    <span className="text-sm font-bold text-tatt-gray leading-tight group-hover:text-foreground transition-colors">{benefit}</span>
                                </div>
                            ))}
                        </div>

                        {/* Order Detail Muted */}
                        <div className="mt-auto pt-8 border-t border-border">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-tatt-gray font-bold uppercase tracking-tight text-[10px]">Status:</span>
                                <span className={`font-black tracking-widest uppercase text-xs px-3 py-1 rounded-full ${planId === 'FREE' ? 'bg-gray-200 text-gray-600' : 'bg-tatt-lime/20 text-tatt-black'}`}>
                                    {planId === 'FREE' ? 'Free & Active' : 'Paid & Active'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-tatt-gray font-bold uppercase tracking-widest">
                                <ShieldCheck className="size-3 text-tatt-lime" />
                                Membership Secured
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            <style jsx>{`
                .bg-pattern {
                    background-image: radial-gradient(#9fcc00 0.5px, transparent 0.5px), radial-gradient(#9fcc00 0.5px, #f8f8f5 0.5px);
                    background-size: 20px 20px;
                    background-position: 0 0, 10px 10px;
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes bounceSubtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-scale-in {
                    animation: scaleIn 0.4s ease-out forwards;
                }
                .animate-bounce-subtle {
                    animation: bounceSubtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}