"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import {
    CreditCard,
    MapPin,
    Lock,
    ArrowLeft,
    ShieldCheck,
    CheckCircle,
    Calendar,
    User,
    Loader2,
    CalendarCheck,
    Trophy
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/auth-context";

const fmt = (n: number) => {
    const rounded = Math.round(n * 100) / 100;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
};

function EventCheckoutContent() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { user } = useAuth();

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const eventResp = await api.get(`/events/${id}`);
                setEvent(eventResp.data);
            } catch (err) {
                console.error("Failed to fetch checkout data", err);
                toast.error("Failed to load event details.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const price = useMemo(() => {
        if (!event || !user) return 0;
        const bPrice = Number(event.basePrice || 0);

        if (user.communityTier === "KIONGOZI") return 0;
        if (user.communityTier === "IMANI") {
            if (event.type === "WORKSHOP") return 0;
            if (event.type === "MIXER") return bPrice * 0.75;
        }
        if (user.communityTier === "UBUNTU") return bPrice * 0.85;
        return bPrice;
    }, [event, user]);

    const handleCompletePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/events/${id}/register`, {
                isBusinessRegistration: false,
                paymentMethodId: "pm_card_visa", // MOCK
            });
            toast.success("Registration & Payment Successful!");
            router.push(`/dashboard/events/${id}/success`);
        } catch (err: any) {
            console.error("Payment failed", err);
            toast.error(err?.response?.data?.message || "Payment failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray animate-pulse">Initializing Checkout Node...</p>
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            
            <button
                onClick={() => router.push(`/dashboard/events/${id}`)}
                className="flex items-center gap-2 text-tatt-gray hover:text-tatt-lime transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-8 group"
            >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Cancel & Return
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Secure Checkout Form */}
                <div className="lg:col-span-7 space-y-8">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tighter mb-2">Secure Checkout</h1>
                        <p className="text-tatt-gray text-sm font-medium">
                            Registering for <strong>{event.title}</strong>
                        </p>
                    </div>

                    <form onSubmit={handleCompletePayment} className="space-y-10">
                        {/* Payment Method Section styled like the upgrade page */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-black text-foreground tracking-tight">Payment Method</h2>
                            </div>

                            <div className="space-y-4 p-6 border-2 border-tatt-lime/30 rounded-2xl bg-surface shadow-sm">
                                <label className="text-[10px] font-black text-foreground uppercase tracking-widest block mb-4">Credit or Debit Card</label>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            className="w-full p-4 pl-12 border border-border rounded-xl focus:ring-2 focus:ring-tatt-lime outline-none transition-all bg-background text-foreground placeholder:text-tatt-gray font-medium"
                                            placeholder="4242 4242 4242 4242"
                                            type="text"
                                            required
                                        />
                                        <CreditCard className="absolute left-4 top-4.5 text-tatt-gray h-5 w-5" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <input
                                                className="w-full p-4 pl-12 border border-border rounded-xl focus:ring-2 focus:ring-tatt-lime outline-none bg-background text-foreground placeholder:text-tatt-gray font-medium"
                                                placeholder="MM / YY"
                                                type="text"
                                                required
                                            />
                                            <Calendar className="absolute left-4 top-4.5 text-tatt-gray h-5 w-5" />
                                        </div>
                                        <div className="relative">
                                            <input
                                                className="w-full p-4 pl-12 border border-border rounded-xl focus:ring-2 focus:ring-tatt-lime outline-none bg-background text-foreground placeholder:text-tatt-gray font-medium"
                                                placeholder="CVC"
                                                type="text"
                                                required
                                            />
                                            <Lock className="absolute left-4 top-4.5 text-tatt-gray h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="w-full p-4 pl-12 border border-border rounded-xl focus:ring-2 focus:ring-tatt-lime outline-none bg-background text-foreground placeholder:text-tatt-gray font-medium"
                                            placeholder="Cardholder Name"
                                            type="text"
                                            required
                                        />
                                        <User className="absolute left-4 top-4.5 text-tatt-gray h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="pt-4 border-t border-border">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-tatt-lime hover:brightness-105 active:scale-[0.98] text-tatt-black font-black py-5 px-8 rounded-2xl transition-all shadow-xl shadow-tatt-lime/20 flex items-center justify-center gap-4 group disabled:opacity-60 disabled:grayscale uppercase tracking-[0.2em] text-xs"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                                {isSubmitting ? "Finalizing Transmission..." : `Complete Registration • $${price.toFixed(2)}`}
                            </button>
                            <p className="text-center text-[10px] font-bold text-tatt-gray mt-4 flex items-center justify-center gap-1.5 uppercase tracking-widest">
                                <Lock className="h-3 w-3" />
                                Secure P2P Encrypted Processing
                            </p>
                        </div>
                    </form>
                </div>

                {/* Right: Event Summary */}
                <div className="lg:col-span-5">
                    <div className="sticky top-12 space-y-6">
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="h-1.5 bg-gradient-to-r from-tatt-lime/50 to-tatt-lime w-full" />

                            <div className="p-8">
                                <h3 className="text-xs font-black text-tatt-gray uppercase tracking-[0.2em] mb-6">Gathering Details</h3>

                                {/* Event Info Card */}
                                <div className="flex gap-4 mb-8">
                                    <div className="size-20 rounded-2xl overflow-hidden bg-tatt-black border border-border shrink-0">
                                        {event.imageUrl ? (
                                            <img src={event.imageUrl} alt="" className="size-full object-cover" />
                                        ) : (
                                            <div className="size-full flex items-center justify-center text-tatt-lime opacity-30">
                                                <Trophy size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-lg text-foreground leading-tight mb-1">{event.title}</h4>
                                        <div className="flex flex-col gap-1">
                                            <p className="flex items-center gap-2 text-[11px] font-bold text-tatt-gray">
                                                <CalendarCheck className="size-3 text-tatt-lime" />
                                                {new Date(event.dateTime).toLocaleDateString()}
                                            </p>
                                            <p className="flex items-center gap-2 text-[11px] font-bold text-tatt-gray">
                                                <MapPin className="size-3 text-tatt-lime" />
                                                {event.locations?.[0]?.address || "Location TBA"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="space-y-4 pt-6 border-t border-border">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-tatt-gray font-medium">Base Ticket Price</span>
                                        <span className="font-bold text-foreground">${fmt(event.basePrice)}</span>
                                    </div>
                                    
                                    {price < event.basePrice && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-tatt-lime font-bold flex items-center gap-1.5">
                                                <Trophy size={14} />
                                                Membership Discount ({user?.communityTier})
                                            </span>
                                            <span className="font-bold text-tatt-lime">-${fmt(event.basePrice - price)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-tatt-gray font-medium">Service Fees</span>
                                        <span className="font-bold text-foreground italic uppercase text-[10px]">Waived</span>
                                    </div>

                                    <div className="flex justify-between items-end pt-6 border-t border-border mt-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-tatt-gray uppercase tracking-widest">Total Amount</span>
                                            <span className="text-3xl font-black text-foreground italic tracking-tighter">${fmt(price)}</span>
                                        </div>
                                        <div className="bg-tatt-lime/10 border border-tatt-lime/20 text-tatt-lime text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                                            Final Access Price
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Proof / Security */}
                        <div className="p-6 bg-background border border-dashed border-border rounded-2xl">
                            <p className="text-[11px] text-tatt-gray font-medium leading-relaxed italic">
                                "TATT events are high-frequency gatherings of African diaspora leadership. Your purchase supports sustainable ecosystem growth."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EventCheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
            </div>
        }>
            <EventCheckoutContent />
        </Suspense>
    );
}
