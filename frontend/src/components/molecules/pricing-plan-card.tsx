"use client";

import React from "react";
import { CheckCircle } from "lucide-react";

export interface Plan {
    id: string;
    tier: string;
    name: string;
    tagline: string;
    monthlyPrice: number;
    yearlyPrice: number;
    stripeProductId?: string;
    stripeMonthlyPriceId?: string;
    stripeYearlyPriceId?: string;
    stripePriceMonthlyId?: string;
    stripePriceYearlyId?: string;
    features: string[];
    isPopular: boolean;
    hasYearlyDiscount: boolean;
    yearlyDiscountPercent?: number;
    eventDiscountPercent?: number;
    accessControls?: { title: string; subtitle: string; enabled: boolean }[];
    activeDiscount?: {
        code: string;
        name: string;
        value: number;
        type: 'percentage' | 'fixed';
        validUntil?: string;
    };
}

interface PricingPlanCardProps {
    plan: Plan;
    isYearly: boolean;
    isCurrentPlan?: boolean;
    isDowngrade?: boolean;
    onSelect: (plan: Plan) => void;
    ctaLabel?: string;
    ctaDisabled?: boolean;
    pulsePopular?: boolean;
}

export const PricingPlanCard: React.FC<PricingPlanCardProps> = ({
    plan,
    isYearly,
    isCurrentPlan = false,
    isDowngrade = false,
    onSelect,
    ctaLabel,
    ctaDisabled = false,
    pulsePopular = true
}) => {
    const isFree = plan.monthlyPrice === 0;
    const displayPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const period = isYearly ? "yr" : "mo";

    // Dynamically calculate yearly savings percentage if not explicitly specified
    const effectiveDiscountPercent = React.useMemo(() => {
        if (plan.yearlyDiscountPercent && plan.yearlyDiscountPercent > 0) {
            return plan.yearlyDiscountPercent;
        }
        if (plan.monthlyPrice > 0 && plan.yearlyPrice > 0) {
            const fullYearlyCost = plan.monthlyPrice * 12;
            if (fullYearlyCost > plan.yearlyPrice) {
                return Math.round(((fullYearlyCost - plan.yearlyPrice) / fullYearlyCost) * 100);
            }
        }
        return null;
    }, [plan.yearlyDiscountPercent, plan.monthlyPrice, plan.yearlyPrice]);

    const fmt = (n: number) => {
        const rounded = Math.round(n * 100) / 100;
        return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
    };

    return (
        <div
            className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm
                ${plan.isPopular
                    ? `border-tatt-lime bg-surface shadow-lg z-10 ring-1 ring-tatt-lime ${pulsePopular ? 'sm:scale-105' : ''}`
                    : "border-border bg-surface hover:border-tatt-lime/40 hover:shadow-md"
                }
                ${isCurrentPlan ? "ring-2 ring-tatt-bronze/50" : ""}
            `}
        >
            <div
                className={`h-1.5 w-full ${isFree
                        ? "bg-tatt-gray/30"
                        : plan.isPopular
                            ? "bg-tatt-lime"
                            : plan.tier === "KIONGOZI"
                                ? "bg-tatt-yellow"
                                : "bg-tatt-bronze"
                    }`}
            />

            {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-tatt-lime text-tatt-black text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                    Most Popular
                </div>
            )}
            
            {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-tatt-bronze text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-br-xl shadow-sm">
                    Current Plan
                </div>
            )}
            
            {isYearly && effectiveDiscountPercent && effectiveDiscountPercent > 0 && (
                <div className={`absolute right-0 bg-tatt-lime/30 border-b border-l border-tatt-lime/20 text-tatt-lime-dark text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl ${plan.isPopular ? "top-7" : "top-0"}`}>
                    Save {effectiveDiscountPercent}%
                </div>
            )}

            <div className="p-6 sm:p-8 flex-1 flex flex-col">
                <div className="mb-6 min-h-[90px]">
                    <h2 className={`text-2xl font-black tracking-tight ${isFree ? "text-tatt-gray" : "text-foreground"}`}>
                        {plan.name}
                    </h2>
                    <p className="text-tatt-gray text-sm font-medium mt-1 leading-relaxed">{plan.tagline}</p>
                </div>

                <div className="mb-8 min-h-[80px]">
                    <div className="flex items-baseline gap-1">
                        {plan.activeDiscount ? (
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black ${isFree ? "text-tatt-gray" : plan.isPopular ? "text-tatt-lime" : "text-foreground"}`}>
                                        ${fmt(
                                            plan.activeDiscount.type === 'percentage'
                                                ? displayPrice * (1 - plan.activeDiscount.value / 100)
                                                : Math.max(0, displayPrice - plan.activeDiscount.value)
                                        )}
                                    </span>
                                    <span className="text-sm font-black text-tatt-gray line-through decoration-red-500/50">${fmt(displayPrice)}</span>
                                </div>
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">
                                    {plan.activeDiscount.name} Applied
                                    {plan.activeDiscount.validUntil && ` • Ends ${new Date(plan.activeDiscount.validUntil).toLocaleDateString()}`}
                                </span>
                            </div>
                        ) : (
                            <span className={`text-4xl font-black ${isFree ? "text-tatt-gray" : plan.isPopular ? "text-tatt-lime" : "text-foreground"}`}>
                                ${fmt(displayPrice)}
                            </span>
                        )}
                        <span className="text-tatt-gray font-bold text-sm">/{period}</span>
                    </div>
                </div>

                <div className="flex-1 mb-10">
                    <ul className="space-y-4 pr-2">
                        {plan.features.map((feature, idx) => (
                            <li key={`feat-${idx}`} className="flex items-start gap-3 text-[13px] leading-snug">
                                <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${isFree ? "text-tatt-gray/40" : "text-tatt-lime"}`} />
                                <span className={isFree ? "text-tatt-gray" : "text-foreground font-semibold"}>{feature}</span>
                            </li>
                        ))}
                        {plan.accessControls?.filter(c => c.enabled).map((control, idx) => (
                            <li key={`ctrl-${idx}`} className="flex items-start gap-3 text-[13px] leading-snug">
                                <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${isFree ? "text-tatt-gray/40" : "text-tatt-lime"}`} />
                                <span className={isFree ? "text-tatt-gray" : "text-foreground font-semibold"}>{control.title}</span>
                            </li>
                        ))}
                        {plan.eventDiscountPercent !== undefined && plan.eventDiscountPercent > 0 && (
                            <li className="flex items-start gap-3 text-[13px] leading-snug">
                                <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${isFree ? "text-tatt-gray/40" : "text-tatt-lime"}`} />
                                <span className={isFree ? "text-tatt-gray" : "text-foreground font-semibold"}>{plan.eventDiscountPercent}% off TATT Events</span>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="mt-auto">
                    {isCurrentPlan ? (
                        <div className="w-full flex items-center justify-center h-[54px] bg-background border border-tatt-bronze/30 rounded-xl text-tatt-bronze text-[11px] font-black uppercase tracking-widest shadow-inner">
                            ✓ Your Current Plan
                        </div>
                    ) : isDowngrade ? (
                        <div className="w-full flex items-center justify-center h-[54px] bg-background border border-dashed border-border rounded-xl text-tatt-gray text-[10px] font-black uppercase tracking-widest opacity-40 cursor-not-allowed">
                            Below your tier
                        </div>
                    ) : (
                        <button
                            onClick={() => !ctaDisabled && onSelect(plan)}
                            disabled={ctaDisabled}
                            className={`w-full h-[54px] rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                                ${plan.isPopular
                                    ? "bg-tatt-lime text-tatt-black hover:brightness-105 shadow-lg shadow-tatt-lime/20"
                                    : plan.tier === "KIONGOZI"
                                        ? "bg-tatt-yellow text-tatt-black hover:brightness-105"
                                        : "bg-tatt-black text-white hover:bg-foreground shadow-md"
                                }
                            `}
                        >
                            {ctaLabel || (isFree ? 'Join for Free' : `Choose ${plan.name}`)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
