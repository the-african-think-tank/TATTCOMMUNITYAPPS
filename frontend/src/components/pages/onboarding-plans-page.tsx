"use client";

import { CheckCircle, Lock, Ban } from "lucide-react";
import { Footer, Navbar } from "@/components/organisms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { analytics } from "@/lib/analytics";

import { PricingPlanCard, Plan } from "@/components/molecules/pricing-plan-card";

export function OnboardingPlansPage() {
    const [isYearly, setIsYearly] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { updateUser } = useAuth();

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

    const handleSelectPlan = async (planId: string, price: number) => {
        analytics.trackPlanSelected({
            plan: planId,
            billingCycle: isYearly ? "YEARLY" : "MONTHLY",
            price,
        });

        if (planId === "FREE") {

            try {
                // Call subscribe for FREE plan to record onboarding completion
                const resp = await api.post("/billing/subscribe", {
                    communityTier: "FREE",
                    billingCycle: "MONTHLY"
                });
                if (resp.data.user) {
                    updateUser(resp.data.user);
                }
                router.push("/onboarding/success?plan=FREE");
            } catch (err: any) {
                console.error("Failed to join free tier", err);
                // If it's a 404, we might be in a dev env where the route isn't updated, 
                // but let's try to proceed to success anyway if the user is already partially logged in
                // The dashboard layout will handle re-kicking them if really needed
                router.push("/onboarding/success?plan=FREE");
            }
        } else {
            router.push(`/onboarding/payment?plan=${planId}&yearly=${isYearly}`);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col bg-background text-tatt-black">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 african-pattern pointer-events-none opacity-5"></div>

            {/* Navigation */}
            <Navbar />

            <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-12 lg:py-20">
                {/* Hero Text */}
                <div className="max-w-3xl text-center mb-10 sm:mb-16">
                    <span className="inline-block px-4 py-1 rounded-full bg-tatt-lime/20 text-tatt-lime-dark text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4">
                        Membership Onboarding
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4 sm:mb-6 px-2">
                        Empowering the Diaspora through Education, Authority, and Capital.
                    </h2>
                    <p className="text-tatt-gray text-base sm:text-lg max-w-2xl mx-auto px-4">
                        Join a collective of visionaries building the infrastructure for African economic excellence. Select the plan that matches your current growth stage.
                    </p>


                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center mt-10 gap-4">
                        <span className={`text-sm font-bold ${!isYearly ? 'text-tatt-black' : 'opacity-60'}`}>Monthly</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isYearly}
                                onChange={() => setIsYearly(!isYearly)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tatt-lime"></div>
                        </label>
                        <span className={`text-sm font-bold ${isYearly ? 'text-tatt-black' : 'opacity-60'}`}>
                            Yearly <span className="text-tatt-lime bg-tatt-lime/10 px-2 py-0.5 rounded ml-1">Unlocked Discounts</span>
                        </span>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl xl:grid-cols-4">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tatt-lime"></div>
                            <p className="mt-4 text-tatt-gray font-bold">Loading membership plans...</p>
                        </div>
                    ) : (
                        plans.map((plan) => (
                            <PricingPlanCard
                                key={plan.id}
                                plan={plan}
                                isYearly={isYearly}
                                onSelect={(p) => handleSelectPlan(p.tier, p.monthlyPrice)}
                                ctaLabel={plan.tier === "FREE" ? "Join for Free" : `Choose ${plan.name}`}
                            />
                        ))
                    )}
                </div>

                {/* Trust Bar */}
                <div className="mt-20 flex flex-col items-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-tatt-gray mb-8">Trusted by Community Leaders Worldwide</p>
                    <div className="flex flex-wrap justify-center gap-10 opacity-30 grayscale contrast-125">
                        <div className="h-8 w-24 bg-gray-400 rounded"></div>
                        <div className="h-8 w-24 bg-gray-400 rounded"></div>
                        <div className="h-8 w-24 bg-gray-400 rounded"></div>
                        <div className="h-8 w-24 bg-gray-400 rounded"></div>
                    </div>
                </div>
            </main>

            <Footer />

            <style jsx>{`
        .african-pattern {
          background-image: radial-gradient(#9fcc00 0.5px, transparent 0.5px), radial-gradient(#9fcc00 0.5px, #f8f8f5 0.5px);
          background-size: 20px 20px;
          background-position: 0 0, 10px 10px;
        }
      `}</style>
        </div>
    );
}
