"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    Calendar, 
    MapPin, 
    Users, 
    DollarSign, 
    ChevronLeft, 
    Building2, 
    Globe, 
    ShieldCheck, 
    TrendingUp, 
    ArrowLeft,
    Clock,
    MoreVertical,
    FileText,
    CreditCard,
    Briefcase,
    Edit2,
    X,
    Plus
} from "lucide-react";
import Image from "next/image";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import dayjs, { formatInTimezone, formatLocalTime, TIMEZONE_GROUPS, toUtcIso, toNativeDateTimeInput, normalizeTimezone } from "@/lib/dayjs";
import { useAuth } from "@/context/auth-context";

export default function EventDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<any>(null);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chapters, setChapters] = useState<any[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        dateTime: "",
        timezone: "America/Los_Angeles",
        type: "EVENT",
        basePrice: 0,
        isForAllMembers: true,
        targetMembershipTiers: [] as string[],
        locations: [] as Array<{ chapterId: string; address: string }>
    });

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const [eventRes, attendeesRes] = await Promise.all([
                    api.get(`/events/${id}`),
                    api.get(`/events/${id}/attendees`)
                ]);
                setEvent(eventRes.data);
                setAttendees(attendeesRes.data || []);
            } catch (err) {
                toast.error("Failed to load event details");
                router.push("/admin/events");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetails();
    }, [id, router]);

    const openEditModal = async () => {
        try {
            const chaptersRes = await api.get("/chapters");
            setChapters(chaptersRes.data || []);
        } catch {
            console.error("Failed to load chapters");
        }

        const normTz = normalizeTimezone(event?.timezone);
        setForm({
            title: event?.title || "",
            description: event?.description || "",
            dateTime: event?.dateTime ? toNativeDateTimeInput(event.dateTime, normTz) : "",
            timezone: normTz,
            type: event?.type || "EVENT",
            basePrice: event?.basePrice || 0,
            isForAllMembers: event?.isForAllMembers ?? true,
            targetMembershipTiers: event?.targetMembershipTiers || [],
            locations: (event?.locations || []).map((loc: any) => ({ chapterId: loc.chapterId, address: loc.address }))
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                dateTime: toUtcIso(form.dateTime, form.timezone),
            };
            const { data } = await api.patch(`/events/${id}`, payload);
            toast.success("Event updated successfully!");
            setEvent(data);
            setIsEditModalOpen(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update event");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-tatt-lime/20 border-t-tatt-lime rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Fetching Secure Event Logs...</p>
                </div>
            </div>
        );
    }

    if (!event) return null;

    const totalRevenue = attendees.reduce((sum, reg) => sum + (Number(reg.amountPaid) || 0), 0);

    return (
        <div className="min-h-screen bg-background p-6 lg:p-12 animate-in fade-in duration-700">
            
            {/* Redesigned Premium Header/Banner */}
            <div className="mb-12">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <button 
                        onClick={() => router.push("/admin/events")}
                        className="flex items-center gap-2 text-tatt-gray hover:text-tatt-lime transition-colors group cursor-pointer"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Directory</span>
                    </button>

                    <button
                        onClick={openEditModal}
                        className="flex items-center gap-2 bg-tatt-lime text-tatt-black px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-tatt-lime/20"
                    >
                        <Edit2 size={14} />
                        <span>Edit Event</span>
                    </button>
                </div>

                <div className="relative rounded-[48px] overflow-hidden bg-surface border border-border shadow-2xl min-h-[340px] flex flex-col justify-end p-10 lg:p-16">
                    {/* Background Visual Attribute */}
                    {event.imageUrl ? (
                        <Image src={event.imageUrl} alt={event.title} fill className="object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000" />
                    ) : (
                        <div className="absolute inset-0 bg-tatt-lime/5 opacity-40">
                             <div className="absolute top-0 right-0 p-20 opacity-10"><Globe size={300} /></div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent"></div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-4 py-1.5 bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-tatt-lime/20">
                                Event Type: {event.type}
                            </span>
                            <span className="px-4 py-1.5 bg-background/50 backdrop-blur-md border border-border text-tatt-gray text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                                SID: {event.id.slice(0, 8)}
                            </span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-foreground tracking-tighter uppercase italic leading-[0.9]">{event.title}</h1>
                        
                        <div className="flex flex-wrap items-center gap-8 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-tatt-lime/10 rounded-xl flex items-center justify-center text-tatt-lime">
                                    <Calendar size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-tatt-gray uppercase tracking-widest opacity-60">Event Native Time</span>
                                    <span className="text-xs font-bold text-tatt-lime">{formatInTimezone(event.dateTime, event.timezone || 'America/Los_Angeles')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-tatt-lime/10 rounded-xl flex items-center justify-center text-tatt-lime">
                                    <Clock size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-tatt-gray uppercase tracking-widest opacity-60">Admin Local Time</span>
                                    <span className="text-xs font-bold">{formatLocalTime(event.dateTime)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-tatt-lime/10 rounded-xl flex items-center justify-center text-tatt-lime">
                                    <MapPin size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-tatt-gray uppercase tracking-widest opacity-60">Base Hub</span>
                                    <span className="text-xs font-bold">{event.locations?.[0]?.chapter?.name || "Global Network"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Left: General Analysis */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <div className="bg-surface border border-border rounded-[40px] p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FileText size={120} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-tatt-lime-dark mb-6">Briefing Summary</h4>
                        <p className="text-lg font-medium text-tatt-gray leading-relaxed max-w-3xl">
                            {event.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 border-t border-border pt-10">
                            <div>
                                <h5 className="font-black uppercase tracking-widest text-[10px] text-tatt-gray mb-4">Venue Logistics</h5>
                                <div className="space-y-4">
                                    {event.locations?.map((loc: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 group">
                                            <div className="size-12 bg-background border border-border rounded-2xl flex items-center justify-center text-tatt-lime group-hover:border-tatt-lime transition-colors">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{loc.chapter?.name}</p>
                                                <p className="text-xs text-tatt-gray font-medium">{loc.address}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!event.locations || event.locations.length === 0) && (
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 bg-background border border-border rounded-2xl flex items-center justify-center text-tatt-lime">
                                                <Globe size={20} />
                                            </div>
                                            <p className="font-bold text-sm">Global Community Event</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h5 className="font-black uppercase tracking-widest text-[10px] text-tatt-gray mb-4">Network Governance</h5>
                                <div className="flex items-center gap-4">
                                    <div className="size-12 bg-background border border-border rounded-2xl flex items-center justify-center text-tatt-lime">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{event.isForAllMembers ? "Public Protocol" : "Tier-Restricted"}</p>
                                        <p className="text-xs text-tatt-gray font-medium leading-relaxed">
                                            {event.isForAllMembers ? "Access granted to entire TATT community." : `Available to: ${event.targetMembershipTiers?.join(", ") || "Specific Tiers"}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Revenue & Attendance */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Financial Snapshot - NO LONGER FULL BLACK */}
                    <div className="bg-surface border border-tatt-lime/20 rounded-[40px] p-8 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-tatt-lime/5 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Revenue Distribution</h3>
                                <TrendingUp className="text-tatt-lime" size={16} />
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[3.5rem] font-black leading-none text-foreground tracking-tighter italic">
                                        <span className="text-tatt-lime">$</span>{totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mt-2 ml-1 flex items-center gap-2">
                                        <CreditCard size={12} className="text-tatt-lime" /> Verified Check-in Revenue
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                                    <div>
                                        <p className="text-xl font-bold">${event.basePrice}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-tatt-gray opacity-60">Base MSRP</p>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold">{attendees.length}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-tatt-gray opacity-60">Verified Bookings</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Ledger */}
                    <div className="bg-surface border border-border rounded-[40px] flex flex-col h-[500px] shadow-sm relative overflow-hidden">
                        <div className="p-8 border-b border-border bg-surface/50 backdrop-blur-md">
                            <h3 className="text-sm font-black uppercase tracking-tight flex items-center justify-between">
                                Attendance Ledger
                                <div className="flex items-center gap-1.5">
                                    <div className="size-1.5 bg-tatt-lime rounded-full animate-pulse shadow-[0_0_8px_rgba(157,255,0,0.5)]"></div>
                                    <span className="text-[10px] font-black text-tatt-lime uppercase italic">Live Feed</span>
                                </div>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {attendees.length === 0 ? (
                                <div className="size-full flex flex-col items-center justify-center text-tatt-gray opacity-30 mt-20">
                                    <Users size={48} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Entry</p>
                                </div>
                            ) : (
                                attendees.map((reg) => (
                                    <div key={reg.id} className="p-5 bg-background/50 border border-border rounded-3xl flex items-center gap-4 hover:border-tatt-lime/30 transition-all group">
                                        <div className="relative size-12 rounded-2xl overflow-hidden border border-border shadow-sm">
                                            {reg.user.profilePicture ? (
                                                <Image src={reg.user.profilePicture} alt={reg.user.firstName} fill className="object-cover" />
                                            ) : (
                                                <div className="size-full bg-tatt-lime-light flex items-center justify-center text-tatt-black font-black text-[10px]">
                                                    {reg.user.firstName?.charAt(0)}{reg.user.lastName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm text-foreground truncate">{reg.user.firstName} {reg.user.lastName}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest bg-tatt-lime text-tatt-black px-1.5 py-0.5 rounded">
                                                    {reg.user.communityTier}
                                                </span>
                                                <span className="text-[9px] text-tatt-gray font-bold truncate opacity-40 italic">Member</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-foreground">${Number(reg.amountPaid).toFixed(2)}</p>
                                            <p className="text-[8px] font-black text-tatt-gray uppercase tracking-widest opacity-40 italic">{reg.isBusinessRegistration ? "Biz" : "Ind"}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Event Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface w-full max-w-2xl rounded-3xl border border-border p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h3 className="text-xl font-black uppercase tracking-tight">Edit Event Details</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 text-tatt-gray hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateEvent} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-sm font-bold">Event Title</label>
                                <input
                                    required
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold">Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={form.dateTime}
                                        onChange={e => setForm({ ...form, dateTime: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold">Event Timezone</label>
                                    <select
                                        value={form.timezone}
                                        onChange={e => setForm({ ...form, timezone: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer"
                                    >
                                        {!TIMEZONE_GROUPS.some(tz => tz.value === form.timezone) && (
                                            <option value={form.timezone}>{form.timezone}</option>
                                        )}
                                        {TIMEZONE_GROUPS.map(tz => (
                                            <option key={tz.value} value={tz.value}>
                                                {tz.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold">Event Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value as any })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer"
                                    >
                                        <option value="EVENT">General Event</option>
                                        <option value="MIXER">Mixer</option>
                                        <option value="WORKSHOP">Workshop</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold">Base Price ($)</label>
                                    <input
                                        type="number"
                                        value={form.basePrice}
                                        onChange={e => setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold">Visibility</label>
                                    <select
                                        value={form.isForAllMembers ? "true" : "false"}
                                        onChange={e => setForm({ ...form, isForAllMembers: e.target.value === "true" })}
                                        disabled={user?.systemRole === 'REGIONAL_ADMIN'}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime disabled:opacity-50"
                                    >
                                        <option value="true">Public / All Members</option>
                                        <option value="false">Restricted / Tier-based</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold">Locations & Chapters</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, locations: [...form.locations, { chapterId: chapters[0]?.id || "", address: "" }] })}
                                        className="text-xs font-bold text-tatt-lime-dark hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="size-3" /> Add Location
                                    </button>
                                </div>
                                {form.locations.map((loc, idx) => (
                                    <div key={idx} className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <select
                                                value={loc.chapterId}
                                                onChange={e => {
                                                    const newLocs = [...form.locations];
                                                    if (newLocs[idx]) newLocs[idx].chapterId = e.target.value;
                                                    setForm({ ...form, locations: newLocs });
                                                }}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs cursor-pointer"
                                            >
                                                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-[2] space-y-1">
                                            <input
                                                value={loc.address}
                                                onChange={e => {
                                                    const newLocs = [...form.locations];
                                                    if (newLocs[idx]) newLocs[idx].address = e.target.value;
                                                    setForm({ ...form, locations: newLocs });
                                                }}
                                                placeholder="Venue address or 'Online'"
                                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, locations: form.locations.filter((_, i) => i !== idx) })}
                                            className="p-2 text-tatt-bronze hover:bg-tatt-yellow/10 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-border flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-tatt-lime text-tatt-green-deep font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-tatt-lime/20 cursor-pointer"
                                >
                                    Update Event
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-8 border border-border font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-border/30 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
