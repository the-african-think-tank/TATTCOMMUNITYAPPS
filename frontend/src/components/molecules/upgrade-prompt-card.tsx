"use client";

import React from "react";
import Link from "next/link";
import { Zap, Crown, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

interface UpgradePromptCardProps {
    currentTier: string;
    className?: string;
}

export const UpgradePromptCard: React.FC<UpgradePromptCardProps> = ({
    currentTier,
    className = "",
}) => {
    const tier = (currentTier || "FREE").toUpperCase();

    // Kiongozi is the highest tier — no upgrade needed
    if (tier === "KIONGOZI") {
        return null;
    }

    if (tier === "FREE") {
        return (
            <div
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-tatt-lime/30 p-6 md:p-8 shadow-xl shadow-tatt-lime/5 ${className}`}
            >
                {/* Background glow & accents */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-tatt-lime/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-tatt-lime/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tatt-lime/10 border border-tatt-lime/30 text-tatt-lime text-xs font-black uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Unlock Full Community Access</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            Upgrade to <span className="text-tatt-lime">Ubuntu</span> & Expand Your Impact
                        </h3>
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                            Free accounts have view-only access. Upgrade your membership to unlock direct member messaging, verified Member ID credentials, exclusive partner discounts, and chapter voting rights.
                        </p>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-1 text-xs font-semibold text-zinc-300">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-tatt-lime" />
                                Verified Member ID
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-tatt-lime" />
                                Direct 1-on-1 Networking
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-tatt-lime" />
                                Exclusive Partner Deals
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                        <Link
                            href="/dashboard/upgrade"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-tatt-lime text-tatt-black font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-tatt-lime/20 cursor-pointer"
                        >
                            <Zap className="h-4 w-4 fill-tatt-black" />
                            <span>Upgrade Membership</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (tier === "UBUNTU") {
        return (
            <div
                className={`relative overflow-hidden rounded-2xl bg-surface border border-border p-6 shadow-sm ${className}`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                Step Up to Imani Tier
                            </span>
                        </div>
                        <h4 className="text-lg font-black text-foreground">
                            Ready to accelerate your leadership and business?
                        </h4>
                        <p className="text-xs text-tatt-gray max-w-xl">
                            Upgrade from Ubuntu to <strong className="text-foreground">Imani ($49.99/mo)</strong> for priority directory placement, chapter voting rights, and exclusive access to executive roundtables.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/upgrade"
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                        <span>Upgrade to Imani</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        );
    }

    if (tier === "IMANI") {
        return (
            <div
                className={`relative overflow-hidden rounded-2xl bg-surface border border-border p-6 shadow-sm ${className}`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                Executive Access — Kiongozi Tier
                            </span>
                        </div>
                        <h4 className="text-lg font-black text-foreground">
                            Reach the pinnacle of community influence
                        </h4>
                        <p className="text-xs text-tatt-gray max-w-xl">
                            Step up to <strong className="text-foreground">Kiongozi ($74.99/mo)</strong> for advisory board representation, VIP event seating, unlimited organization job posts, and global partner features.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/upgrade"
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                        <span>Upgrade to Kiongozi</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        );
    }

    return null;
};
