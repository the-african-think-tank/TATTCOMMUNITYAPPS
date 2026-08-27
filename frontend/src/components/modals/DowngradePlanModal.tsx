"use client";

import React from "react";
import { ArrowDownCircle, Loader2 } from "lucide-react";
import { AppModal } from "@/components/modals/app-modal";

export interface DowngradePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    currentTierName: string;
    targetTierName: string;
    targetPriceLabel?: string | null | undefined;
    expiresAt?: Date | string | null | undefined;
}

export const DowngradePlanModal: React.FC<DowngradePlanModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    currentTierName,
    targetTierName,
    targetPriceLabel,
    expiresAt,
}) => {
    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            dialogClass="bg-surface border border-border rounded-3xl"
            showCloseButton={false}

        >
            <div className="flex flex-col">

                <h3 className="text-2xl font-black mb-4">Schedule Downgrade to {targetTierName}?</h3>
                <p className="text-tatt-gray text-sm mb-6 leading-relaxed">
                    Your current <strong>{currentTierName}</strong> membership will remain fully active until{" "}
                    <strong>{expiresAt ? new Date(expiresAt).toLocaleDateString() : "the end of your current billing period"}</strong>.
                    <br /><br />
                    Starting on your next billing date, your subscription will automatically switch to the <strong>{targetTierName}</strong> {targetPriceLabel ? `(${targetPriceLabel})` : ""} plan without extra charges today.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full py-4 bg-tatt-lime cursor-pointer text-black text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-tatt-lime/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : `Confirm Downgrade to ${targetTierName}`}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-2 text-tatt-gray cursor-pointer hover:text-foreground text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                        Keep {currentTierName} Plan
                    </button>
                </div>
            </div>
        </AppModal>
    );
};
