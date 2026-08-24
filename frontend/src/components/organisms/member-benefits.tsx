"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { CheckCircle, Zap, ArrowRight, Shield, Award, Loader2 } from "lucide-react";
import Link from "next/link";

interface Plan {
    id: string;
    tier: string;
    name: string;
    features: string[];
    accessControls?: { title: string; subtitle: string; enabled: boolean }[];
}

export function MemberBenefits() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data } = await api.get("/billing/plans");
                setPlans(data);
            } catch (error) {
                console.error("Failed to fetch plans", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    if (loading) {
        return (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-6 flex justify-center items-center h-48">
                <Loader2 className="animate-spin size-8 text-tatt-lime" />
            </div>
        );
    }

    if (!plans.length) return null;

    const isFree = user?.communityTier === "FREE" || !user?.communityTier;

    if (isFree) {
        // Show all plans except free
        const paidPlans = plans.filter(p => p.tier !== "FREE").sort((a, b) => {
             const tiers = { "UBUNTU": 1, "IMANI": 2, "KIONGOZI": 3 };
             // @ts-ignore
             return (tiers[a.tier] || 0) - (tiers[b.tier] || 0);
        });
        
        return (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-bold text-xl text-foreground tracking-tight flex items-center gap-2">
                            <Award className="size-5 text-tatt-lime" />
                            Premium Member Benefits
                        </h3>
                        <p className="text-sm text-tatt-gray font-medium mt-1">Unlock these exclusive benefits and take your network to the next level.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {paidPlans.map(plan => (
                        <div key={plan.id} className="bg-background rounded-xl p-5 border border-border flex flex-col items-start hover:border-tatt-lime/50 transition-colors shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1 bg-tatt-lime/70" />
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-tatt-lime/10 text-tatt-black text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                                <Zap className="size-3" />
                                {plan.name}
                            </div>
                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features?.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2.5">
                                        <CheckCircle className="size-4 shrink-0 text-tatt-lime/80" />
                                        <span className="text-xs font-bold text-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-8">
                    <Link href="/dashboard/upgrade" className="flex items-center justify-center gap-2 w-full py-4 bg-tatt-black text-tatt-lime rounded-xl text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md">
                        Upgrade to Enjoy Benefits <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        );
    }

    // Paid users: match based on user's plan
    const currentPlan = plans.find(p => p.tier === user.communityTier);
    if (!currentPlan) return null;

    return (
        <div className="bg-gradient-to-br from-tatt-black to-background rounded-xl border border-white/10 shadow-lg p-6 md:p-8 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 size-48 bg-tatt-lime/10 blur-3xl -mr-16 -mt-16 rounded-full" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-bold text-2xl text-white tracking-tight flex items-center gap-2">
                            <Shield className="size-6 text-tatt-lime" />
                            Your {currentPlan.name} Benefits
                        </h3>
                        <p className="text-sm text-white/60 font-medium mt-2">Make the most of your active membership tier with these advantages.</p>
                    </div>
                    {user.communityTier !== "KIONGOZI" && (
                        <Link href="/dashboard/upgrade" className="shrink-0 text-xs font-black bg-white/10 hover:bg-white/20 text-white px-4 py-2 border border-white/5 rounded-lg uppercase tracking-widest transition-colors hidden sm:block">
                            View All Tiers
                        </Link>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentPlan.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                            <CheckCircle className="size-5 shrink-0 text-tatt-lime" />
                            <span className="text-sm font-bold text-white">{feature}</span>
                        </div>
                    ))}
                </div>
                {user.communityTier !== "KIONGOZI" && (
                    <div className="mt-6 sm:hidden">
                        <Link href="/dashboard/upgrade" className="flex justify-center text-xs font-black bg-white/10 hover:bg-white/20 text-white px-4 py-3 border border-white/5 rounded-lg uppercase tracking-widest transition-colors w-full">
                            Upgrade Tier
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
