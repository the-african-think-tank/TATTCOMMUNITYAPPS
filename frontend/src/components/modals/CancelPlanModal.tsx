"use client";

import React from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

export interface CancelPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    tierName: string;
    expiresAt?: Date | string | null | undefined;
    reason: string;
    setReason: (r: string) => void;
}

export const CancelPlanModal: React.FC<CancelPlanModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    tierName,
    expiresAt,
    reason,
    setReason,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute cursor-pointer top-6 right-6 text-tatt-gray hover:text-foreground">
                    <X className="size-6" />
                </button>

                <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                    <AlertTriangle className="text-red-500 size-7" />
                </div>

                <h3 className="text-2xl font-black mb-2">Cancel {tierName} Subscription?</h3>
                <p className="text-tatt-gray text-sm mb-6 leading-relaxed">
                    Your plan will remain active until{" "}
                    <strong>{expiresAt ? new Date(expiresAt).toLocaleDateString() : "the end of your billing period"}</strong>.
                    After that, your account will return to the Free tier.
                </p>

                <div className="space-y-2 mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray block">
                        Reason for Cancellation (Optional)
                    </label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-background border cursor-pointer border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                    >
                        <option value="">Select a reason...</option>
                        <option value="Too expensive">Too expensive</option>
                        <option value="Not using benefits">Not using benefits enough</option>
                        <option value="Switching to another platform">Switching to another platform</option>
                        <option value="Temporary pause">Temporary pause</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-4 bg-tatt-lime cursor-pointer text-black text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-tatt-lime/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        Keep My Subscription
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        disabled={isLoading}
                        className="w-full py-2 text-tatt-gray cursor-pointer hover:text-red-500 text-xs font-bold hover:underline transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : "I still want to cancel my subscription"}
                    </button>
                </div>
            </div>
        </div>
    );
};
