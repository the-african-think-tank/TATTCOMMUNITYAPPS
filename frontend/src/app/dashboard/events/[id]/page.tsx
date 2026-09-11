"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Calendar,
    MapPin,
    Clock,
    Users,
    User,
    ArrowLeft,
    Loader2,
    CheckCircle,
    ExternalLink,
    Lock,
    Trophy,
    Edit2
} from "lucide-react";
import dayjs, { formatLocalTimeString } from "@/lib/dayjs";
import type { EventItem } from "@/types/events";

function formatDate(dateTime: string) {
    try {
        return dayjs(dateTime).format("dddd, MMMM D, YYYY");
    } catch {
        return "";
    }
}

function formatTime(dateTime: string) {
    if (!dateTime) return "";
    return formatLocalTimeString(dateTime);
}

function typeLabel(type: string): string {
    switch (type) {
        case "WORKSHOP": return "Regional Workshop";
        case "MIXER": return "Community Mixer";
        case "EVENT": return "Strategy Intensive";
        default: return type;
    }
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params?.id as string;

    const [event, setEvent] = useState<EventItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [registrationDone, setRegistrationDone] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchEvent = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await api.get<EventItem>(`/events/${id}`);
                setEvent(data);
            } catch (err: unknown) {
                const msg = err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : "Event not found.";
                setError(Array.isArray(msg) ? msg[0] : (msg ?? "Event not found."));
                setEvent(null);
            } finally {
                setLoading(false);
            }
        };

        const fetchAttendees = async () => {
            setLoadingAttendees(true);
            try {
                const { data } = await api.get(`/events/${id}/attendees`);
                setAttendees(data || []);
            } catch (err) {
                console.error("Failed to load attendees", err);
            } finally {
                setLoadingAttendees(false);
            }
        };

        fetchEvent();
        fetchAttendees();
    }, [id]);

    const handleRegister = async (isBusinessRegistration = false) => {
        if (!id || registering) return;
        setRegistering(true);
        try {
            const { data } = await api.post<{ registration?: unknown; message?: string; checkoutUrl?: string }>(
                `/events/${id}/register`,
                { isBusinessRegistration }
            );
            setRegistrationDone(true);
            if (data?.checkoutUrl) {
                setCheckoutUrl(data.checkoutUrl);
            }
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "response" in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : "Registration failed.";
            setError(Array.isArray(msg) ? msg[0] : (msg ?? "Registration failed."));
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="min-h-screen bg-background px-4 py-8">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-foreground font-medium mb-4">{error}</p>
                    <Link
                        href="/dashboard/events"
                        className="inline-flex items-center gap-2 text-tatt-lime font-bold hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Events
                    </Link>
                </div>
            </div>
        );
    }

    if (!event) return null;

    const firstLocation = event.locations?.[0];
    const address = firstLocation?.address ?? "Virtual event";
    const isVirtual = address.toLowerCase().includes("zoom") || address.toLowerCase().includes("virtual");

    // Price calculation logic
    const calculatePrice = () => {
        if (!event) return 0;
        const bPrice = Number(event.basePrice || 0);
        if (!user) return bPrice;

        if (user.communityTier === "KIONGOZI") return 0;

        if (user.communityTier === "IMANI") {
            if (event.type === "WORKSHOP") return 0;
            if (event.type === "MIXER") return bPrice * 0.75;
        }

        if (user.communityTier === "UBUNTU") {
            return bPrice * 0.85;
        }

        return bPrice;
    };

    const price = calculatePrice();
    const isEligible = event.isForAllMembers || (event.targetMembershipTiers && event.targetMembershipTiers.includes(user?.communityTier || ""));
    const isAlreadyRegistered = registrationDone || (!!user && attendees.some(reg => reg.userId === user.id || reg.user?.id === user.id));

    return (
        <div className="min-h-screen w-full bg-background text-foreground">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <Link
                        href="/dashboard/events"
                        className="inline-flex items-center gap-2 text-tatt-gray hover:text-tatt-lime font-medium text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Workshops &amp; Events
                    </Link>

                    {user && (user.systemRole === "SUPER_ADMIN" || user.systemRole === "REGIONAL_ADMIN") && (
                        <Link
                            href={`/admin/events/${event.id}`}
                            className="inline-flex items-center gap-2 bg-tatt-lime text-tatt-black px-4 py-2 rounded-xl font-bold text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                            <Edit2 className="h-3.5 w-3.5" /> Edit Event
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative aspect-video sm:aspect-[21/9] rounded-xl overflow-hidden bg-tatt-black">
                            {event.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={event.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full bg-cover bg-center"
                                    style={{
                                        backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200')",
                                    }}
                                />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-tatt-black/90 to-transparent">
                                <span className="text-tatt-lime text-xs font-bold uppercase tracking-widest">
                                    {typeLabel(event.type)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface rounded-xl border border-border p-6 sm:p-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4">
                                {event.title}
                            </h1>
                            <div className="prose prose-sm max-w-none text-foreground/90 mb-6">
                                {event.description}
                            </div>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-tatt-lime shrink-0" />
                                    <span>{formatDate(event.dateTime)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-tatt-lime shrink-0" />
                                    <span>{formatTime(event.dateTime)}</span>
                                </div>
                                <div className="flex items-center gap-3 sm:col-span-2">
                                    {isVirtual ? (
                                        <><MapPin className="h-5 w-5 text-tatt-lime shrink-0" /> Virtual Event (Zoom)</>
                                    ) : (
                                        <><MapPin className="h-5 w-5 text-tatt-lime shrink-0" /> {address}</>
                                    )}
                                </div>
                                {event.featuredGuests?.length ? (
                                    <div className="flex items-center gap-3 sm:col-span-2">
                                        <User className="h-5 w-5 text-tatt-lime shrink-0" />
                                        <span>
                                            Lead: {event.featuredGuests.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}
                                        </span>
                                    </div>
                                ) : null}
                            </dl>
                        </div>

                        {/* Who's Going Section */}
                        <div className="bg-surface rounded-xl border border-border p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-tatt-lime flex items-center gap-2">
                                    <Users className="size-4" /> Who's Joining
                                </h3>
                                <span className="text-xs font-bold text-tatt-gray">
                                    {attendees.length} Thinking Partners
                                </span>
                            </div>

                            {loadingAttendees ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="size-6 animate-spin text-tatt-lime" />
                                </div>
                            ) : attendees.length === 0 ? (
                                <div className="text-center py-8 bg-background/50 rounded-2xl border border-dashed border-border">
                                    <p className="text-xs text-tatt-gray italic font-medium">Be the first to join this gathering!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {attendees.map((reg) => (
                                        <div key={reg.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-background transition-colors group">
                                            <div className="size-10 rounded-full overflow-hidden border border-border shrink-0 group-hover:border-tatt-lime/50 transition-colors">
                                                {reg.user.profilePicture ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={reg.user.profilePicture} alt={reg.user.firstName} className="size-full object-cover" />
                                                ) : (
                                                    <div className="size-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime text-[10px] font-black uppercase italic">
                                                        {reg.user.firstName?.[0]}{reg.user.lastName?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-foreground truncate">{reg.user.firstName} {reg.user.lastName}</p>
                                                <p className="text-[8px] font-bold text-tatt-gray truncate uppercase tracking-tighter">{reg.user.professionTitle || "Member"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-surface rounded-xl border border-border p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-foreground mb-4">Register</h2>
                            {isAlreadyRegistered ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-tatt-lime font-medium">
                                        <CheckCircle className="h-6 w-6 shrink-0" />
                                        You’re registered for this event.
                                    </div>
                                    {checkoutUrl ? (
                                        <a
                                            href={checkoutUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-tatt-lime text-tatt-black font-bold rounded-lg hover:brightness-95"
                                        >
                                            Complete payment <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <p className="text-sm text-foreground font-medium mb-4">{error}</p>
                                    )}
                                    <div className="space-y-4">
                                        {!isEligible ? (
                                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
                                                <Lock className="size-10 text-red-500 mx-auto" />
                                                <h3 className="text-sm font-black uppercase tracking-widest text-red-500">Tier Restriction</h3>
                                                <p className="text-xs font-medium text-tatt-gray italic">
                                                    This gathering is exclusive to {event.targetMembershipTiers?.join(", ")} members. Upgrade your tier to gain access.
                                                </p>
                                                <Link 
                                                    href="/dashboard/upgrade"
                                                    className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime hover:underline"
                                                >
                                                    View Upgrades
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="bg-background/50 border border-border rounded-2xl p-6 space-y-6">
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="size-16 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime mb-4">
                                                        <Trophy size={32} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-1">Your Entry Ticket</p>
                                                    <h3 className="text-4xl font-black italic tracking-tighter text-foreground">
                                                        {price === 0 ? "INCLUDED" : `$${price.toFixed(2)}`}
                                                    </h3>
                                                    {price < event.basePrice && (
                                                        <p className="text-[10px] font-black text-tatt-lime uppercase tracking-widest mt-2 bg-tatt-lime/10 px-3 py-1 rounded-full border border-tatt-lime/20">
                                                            {Math.round((1 - price/event.basePrice) * 100)}% Member Discount Applied
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => price === 0 ? handleRegister(false) : router.push(`/dashboard/events/${id}/checkout`)}
                                                    disabled={registering}
                                                    className="w-full py-4 bg-tatt-lime text-tatt-black font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:brightness-110 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 transition-all shadow-xl shadow-tatt-lime/20"
                                                >
                                                    {registering ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                    {price === 0 ? "Confirm Enrollment" : "Purchase Ticket"}
                                                </button>

                                                {user?.communityTier === "KIONGOZI" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRegister(true)}
                                                        disabled={registering}
                                                        className="w-full py-4 border-2 border-dashed border-border text-foreground font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-white/5 transition-all"
                                                    >
                                                        Register Business Entity
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
