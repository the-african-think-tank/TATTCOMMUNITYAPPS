"use client";

import React from "react";
import Link from "next/link";
import { Zap, X, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

interface UpgradeReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BENEFITS = [
    "Verified Member ID Card",
    "Direct 1-on-1 Networking",
    "Chapter Voting Rights",
    "Exclusive Partner Deals",
];

export function UpgradeReminderModal({ isOpen, onClose }: UpgradeReminderModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
                onClick={onClose}
            />

            {/* Card */}
            <div className="relative bg-tatt-black w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10 p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
                {/* Glow accents */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-tatt-lime/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-tatt-lime/10 rounded-full blur-2xl pointer-events-none" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Icon */}
                <div className="relative z-10 size-20 bg-tatt-lime/10 border border-tatt-lime/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-10 w-10 text-tatt-lime fill-tatt-lime/30" />
                </div>

                {/* Badge */}
                <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tatt-lime/10 border border-tatt-lime/30 text-tatt-lime text-[10px] font-black uppercase tracking-wider mb-4">
                    <Sparkles className="h-3 w-3" />
                    Unlock Full Community Access
                </div>

                {/* Heading */}
                <h2 className="relative z-10 text-2xl font-black text-white mb-3 tracking-tight leading-tight">
                    You&apos;re on the Free Plan
                </h2>
                <p className="relative z-10 text-white/60 text-sm leading-relaxed mb-6">
                    Upgrade to Ubuntu and unlock direct networking, verified credentials, and exclusive community benefits.
                </p>

                {/* Benefits list */}
                <ul className="relative z-10 space-y-2.5 mb-8 text-left">
                    {BENEFITS.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-tatt-lime" />
                            <span className="text-sm font-semibold text-white/80">{benefit}</span>
                        </li>
                    ))}
                </ul>

                {/* CTAs */}
                <div className="relative z-10 flex flex-col gap-3">
                    <Link
                        href="/dashboard/upgrade"
                        onClick={onClose}
                        className="w-full bg-tatt-lime text-tatt-black font-black py-4 rounded-2xl uppercase tracking-[0.15em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Zap className="h-4 w-4" />
                        View Plans &amp; Upgrade
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-xs font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
