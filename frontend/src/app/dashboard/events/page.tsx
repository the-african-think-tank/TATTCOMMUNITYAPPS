"use client";

import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    MapPin,
    Users,
    Clock,
    Globe,
    Lock,
    Search,
    Filter,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Video,
    Trophy,
    ArrowRight
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { toast, Toaster } from "react-hot-toast";
import dayjs, { formatLocalTime } from "@/lib/dayjs";
import { useRouter } from "next/navigation";

interface Event {
    id: string;
    title: string;
    description: string;
    dateTime: string;
    type: "EVENT" | "MIXER" | "WORKSHOP";
    imageUrl?: string;
    isForAllMembers: boolean;
    basePrice: number;
    targetMembershipTiers?: string[];
    locations: Array<{
        chapterId: string;
        address: string;
        chapter?: {
            name: string;
        };
    }>;
}

export default function EventsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        fetchEvents();
    }, []);

    const safeDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch {
            return new Date();
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get("/events");
            setEvents(res.data);
        } catch (error) {
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const calculatePrice = (event: Event) => {
        const basePrice = Number(event.basePrice || 0);
        if (!user) return basePrice;

        if (user.communityTier === "KIONGOZI") return 0;

        if (user.communityTier === "IMANI") {
            if (event.type === "WORKSHOP") return 0;
            if (event.type === "MIXER") return basePrice * 0.75;
        }

        if (user.communityTier === "UBUNTU") {
            return basePrice * 0.85;
        }

        return basePrice;
    };

    const filteredEvents = (events || []).filter(e => {
        if (!e) return false;
        if (filter === "ALL") return true;
        if (filter === "MY_CHAPTER") {
            return (e.locations || []).some(l => l?.chapterId === user?.chapterId);
        }
        return e.type === filter;
    });

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-screen">
            <Toaster position="top-right" />

            <header className="mb-10">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Events & Mixers</h1>
                <p className="text-tatt-gray mt-2 font-medium max-w-2xl">
                    Connect with fellow thinking partners, join workshops, and attend our exclusive mixers across all chapters.
                </p>
            </header>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-8">
                {["ALL", "MY_CHAPTER", "MIXER", "WORKSHOP", "EVENT"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${filter === f
                            ? "bg-tatt-lime text-tatt-black border-tatt-lime shadow-lg shadow-tatt-lime/20"
                            : "bg-surface text-tatt-gray border-border hover:border-tatt-lime/50"
                            }`}
                    >
                        {f.replace("_", " ")}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="size-10 animate-spin text-tatt-lime" />
                    <p className="text-tatt-gray font-bold animate-pulse">Scanning the ecosystem for events...</p>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
                    <CalendarIcon className="size-16 text-tatt-gray mx-auto mb-4 opacity-20" />
                    <h3 className="text-xl font-bold mb-2">No events found</h3>
                    <p className="text-tatt-gray max-w-xs mx-auto text-sm">
                        There are no events matching your filter at the moment. Check back soon!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map(event => {
                        const price = calculatePrice(event);
                        const isFree = price === 0;
                        const hasDiscount = price < event.basePrice;

                        return (
                            <div 
                                key={event.id} 
                                onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                className="group bg-surface rounded-3xl border border-border overflow-hidden hover:shadow-xl hover:border-tatt-lime/30 transition-all flex flex-col cursor-pointer"
                            >
                                {/* Event Image */}
                                <div className="relative h-48 bg-tatt-black">
                                    {event.imageUrl ? (
                                        <Image src={event.imageUrl} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center opacity-20 grayscale scale-150">
                                            <Trophy className="size-24 text-tatt-lime" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg ${event.type === 'MIXER' ? 'bg-orange-500 text-white' :
                                            event.type === 'WORKSHOP' ? 'bg-blue-500 text-white' :
                                                'bg-purple-500 text-white'
                                            }`}>
                                            {event.type}
                                        </span>
                                        {!event.isForAllMembers && (
                                            <span className="bg-black/60 backdrop-blur-md text-amber-500 px-2.5 py-1 rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-amber-500/30 uppercase tracking-widest">
                                                <Lock className="size-3" /> Restricted Node
                                            </span>
                                        )}
                                        {!event.isForAllMembers && event.targetMembershipTiers && !event.targetMembershipTiers.includes(user?.communityTier || "") && (
                                            <div className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-black flex items-center gap-1.5 uppercase tracking-widest shadow-lg">
                                                <Lock className="size-3" /> Tier Locked
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-4 right-4 bg-tatt-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-white text-center min-w-[60px]">
                                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none">
                                            {dayjs(event.dateTime).format("MMM")}
                                        </p>
                                        <p className="text-xl font-black leading-none mt-1">
                                            {dayjs(event.dateTime).format("DD")}
                                        </p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-tatt-lime transition-colors line-clamp-2">
                                            {event.title}
                                        </h3>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-xs font-medium text-tatt-gray">
                                                <Clock className="size-3.5 text-tatt-lime" />
                                                <span>{formatLocalTime(event.dateTime)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-tatt-gray">
                                                <MapPin className="size-3.5 text-tatt-lime" />
                                                <span className="truncate">{event.locations?.[0]?.address || "Location TBA"}</span>
                                            </div>
                                            {event.locations?.[0]?.chapter?.name && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-tatt-gray">
                                                    <Globe className="size-3.5 text-tatt-lime" />
                                                    <span>{event.locations[0]?.chapter?.name} Chapter</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer / Pricing */}
                                    <div className="pt-6 border-t border-border flex items-center justify-between mt-auto">
                                        <div>
                                            {isFree ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-tatt-lime uppercase tracking-widest leading-none mb-1">Full Access</span>
                                                    <span className="text-xl font-black text-foreground italic uppercase italic tracking-tighter">FREE PASS</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Entry Ticket</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-black text-foreground">${Number(price).toFixed(2)}</span>
                                                        {hasDiscount && (
                                                            <span className="text-xs text-tatt-gray line-through decoration-red-500/50">${Number(event.basePrice).toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isFree ? 'bg-tatt-black text-white group-hover:bg-tatt-lime group-hover:text-tatt-black' : 'bg-tatt-lime text-tatt-black group-hover:scale-110 active:scale-95'}`}
                                        >
                                            <ArrowRight className="size-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
