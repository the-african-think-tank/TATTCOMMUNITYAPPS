"use client";

import React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { AppModal } from "@/components/modals/app-modal";

export interface ConfirmRevertDowngradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    currentTierName: string;
    targetTierName?: string | null | undefined;
    expiresAt?: Date | string | null | undefined;
}

export const ConfirmRevertDowngradeModal: React.FC<ConfirmRevertDowngradeModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    currentTierName,
    targetTierName,
    expiresAt,
}) => {
    const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'the end of your billing cycle';

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            dialogClass="bg-surface border border-border rounded-3xl"
            showCloseButton={false}
        >
            <div className="flex flex-col">
                <h3 className="text-2xl font-black mb-2">Keep {currentTierName} Subscription?</h3>
                <p className="text-tatt-gray text-sm mb-6 leading-relaxed">
                    This will cancel your scheduled {targetTierName ? `downgrade to ${targetTierName}` : 'cancellation'}. Your subscription will continue renewing as <strong>{currentTierName}</strong> on <strong>{formattedDate}</strong>.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full py-4 bg-tatt-lime cursor-pointer text-black text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-tatt-lime/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : `Keep My ${currentTierName} Plan`}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-2 text-tatt-gray cursor-pointer hover:text-foreground text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </AppModal>
    );
};
