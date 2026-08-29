"use client";

import { useState, useEffect } from "react";
import {
    Calendar,
    Plus,
    Search,
    Filter,
    MoreVertical,
    TrendingUp,
    Calendar as CalendarIcon,
    Users,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Building2,
    Globe,
    Lock,
    X,
    Loader2,
    Image as ImageIcon,
    CheckCircle2,
    Edit2,
    Trash2,
    Clock
} from "lucide-react";
import Image from "next/image";
import api from "@/services/api";
import { toast, Toaster } from "react-hot-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import dayjs, { TIMEZONE_GROUPS, toUtcIso, formatLocalTime, formatInTimezone, formatLocalTimeString, toNativeDateTimeInput, normalizeTimezone } from "@/lib/dayjs";

// --- Types ---

interface Event {
    id: string;
    title: string;
    description: string;
    dateTime: string;
    timezone?: string;
    type: "EVENT" | "MIXER" | "WORKSHOP";
    imageUrl?: string;
    isForAllMembers: boolean;
    basePrice: number;
    locations: Array<{
        chapterId: string;
        address: string;
        chapter: {
            id: string;
            name: string;
            code: string;
        };
    }>;
    registrationsCount?: number;
}

interface Chapter {
    id: string;
    name: string;
    code: string;
    regionalManagerId?: string;
    associateRegionalDirectorId?: string;
}

export default function AdminEventsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');

    const safeDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch {
            return new Date();
        }
    };

    // Form State
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
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventsRes, chaptersRes] = await Promise.all([
                api.get("/events"),
                api.get("/chapters")
            ]);
            setEvents(eventsRes.data || []);
            setChapters(chaptersRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load events or chapters");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                dateTime: toUtcIso(form.dateTime, form.timezone),
            };
            if (isEditMode && editingEventId) {
                await api.patch(`/events/${editingEventId}`, payload);
                toast.success("Event updated successfully!");
            } else {
                await api.post("/events", payload);
                toast.success("Event created successfully!");
            }
            setIsCreateModalOpen(false);
            setEditingEventId(null);
            fetchData();
            setForm({
                title: "",
                description: "",
                dateTime: "",
                timezone: "America/Los_Angeles",
                type: "EVENT",
                basePrice: 0,
                isForAllMembers: true,
                targetMembershipTiers: [],
                locations: []
            });
            setIsEditMode(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} event`);
        }
    };

    const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        
        try {
            await api.delete(`/events/${id}`);
            toast.success("Event deleted successfully");
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete event");
        }
    };

    const fetchAttendees = async (eventId: string) => {
        setLoadingAttendees(true);
        try {
            const res = await api.get(`/events/${eventId}/attendees`);
            setAttendees(res.data || []);
        } catch (error) {
            toast.error("Failed to load attendees");
        } finally {
            setLoadingAttendees(false);
        }
    };

    const handleEventClick = (event: Event) => {
        router.push(`/admin/events/${event.id}`);
    };


    const handleEditClick = (event: Event, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent(null);
        setEditingEventId(event.id);
        setIsEditMode(true);
        const normTz = normalizeTimezone(event.timezone);
        setForm({
            title: event.title,
            description: event.description,
            dateTime: toNativeDateTimeInput(event.dateTime, normTz),
            timezone: normTz,
            type: event.type,
            basePrice: event.basePrice,
            isForAllMembers: event.isForAllMembers,
            targetMembershipTiers: (event as any).targetMembershipTiers || [],
            locations: event.locations.map(loc => ({ chapterId: loc.chapterId, address: loc.address }))
        });
        setIsCreateModalOpen(true);
        setOpenMenuId(null);
    };

    // Calendar logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getTypeBadgeClass = (type: string) => {
        if (type === "MIXER") return "bg-tatt-yellow/20 text-tatt-bronze-dark";
        if (type === "WORKSHOP") return "bg-tatt-lime-light text-tatt-lime-dark";
        return "bg-tatt-green-deep/10 text-tatt-green-deep";
    };

    const availableChapters = user?.systemRole === 'REGIONAL_ADMIN' 
        ? chapters.filter(c => c.regionalManagerId === user?.id || c.associateRegionalDirectorId === user?.id)
        : chapters;

    return (
        <div className="min-h-screen bg-background text-foreground p-8 lg:p-12">
            <Toaster position="top-right" />
            
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase">Events & Mixers</h1>
                    <p className="text-tatt-gray mt-2 text-base font-medium">Coordinate community gatherings and manage workshop participation.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex p-1 bg-surface border border-border rounded-xl shadow-sm">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'grid' ? 'bg-tatt-lime text-tatt-black shadow-md' : 'text-tatt-gray hover:text-tatt-black'}`}
                        >
                            Grid
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'list' ? 'bg-tatt-lime text-tatt-black shadow-md' : 'text-tatt-gray hover:text-tatt-black'}`}
                        >
                            List
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-tatt-lime text-tatt-black shadow-md' : 'text-tatt-gray hover:text-tatt-black'}`}
                        >
                            Calendar
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setIsEditMode(false);
                            setEditingEventId(null);
                            setSelectedEvent(null);
                            setForm({
                                title: "",
                                description: "",
                                dateTime: "",
                                timezone: "America/Los_Angeles",
                                type: "EVENT",
                                basePrice: 0,
                                isForAllMembers: true,
                                targetMembershipTiers: [],
                                locations: []
                            });
                            setIsCreateModalOpen(true);
                        }}
                        className="bg-tatt-lime hover:bg-tatt-lime-dark text-tatt-green-deep px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-tatt-lime/20 transition-all border-2 border-tatt-lime-dark/10"
                    >
                        <Plus className="size-5" strokeWidth={3} />
                        <span className="uppercase tracking-widest text-xs font-black">New Event</span>
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard
                    icon={<CalendarIcon className="text-tatt-lime-dark" />}
                    label="Upcoming Events"
                    value={events.filter(e => safeDate(e.dateTime) > new Date()).length.toString()}
                    trend="+2%"
                />
                <StatCard
                    icon={<Users className="text-tatt-lime-dark" />}
                    label="Total Registrations"
                    value={events.reduce((acc, e) => acc + (e.registrationsCount || 0), 0).toString()}
                    trend="+15%"
                />
                <StatCard
                    icon={<DollarSign className="text-tatt-lime-dark" />}
                    label="Revenue Goal"
                    value={`$${events.reduce((acc, e) => acc + (e.basePrice * (e.registrationsCount || 0)), 0).toLocaleString()}`}
                    trend="+8%"
                />
            </section>

            {viewMode === 'calendar' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Calendar code remains similar but update handleEventClick to navigate or maybe show card on click */}
                    <section className="xl:col-span-3 bg-surface p-10 rounded-3xl border border-border shadow-xl min-h-[600px]">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight">{format(currentDate, "MMMM yyyy")}</h2>
                                <p className="text-tatt-gray text-sm font-medium">Ecosystem engagement schedule overview.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 bg-background border border-border rounded-xl hover:bg-surface transition-all"><ChevronLeft className="size-6" /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="px-6 py-2 text-xs font-bold uppercase tracking-widest border border-border rounded-xl">Today</button>
                                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 bg-background border border-border rounded-xl hover:bg-surface transition-all"><ChevronRight className="size-6" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 text-center text-xs font-black text-tatt-gray uppercase tracking-[0.2em] mb-6 opacity-60">
                            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                        </div>

                        <div className="grid grid-cols-7 gap-4">
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square bg-border/5 rounded-2xl border border-transparent"></div>
                            ))}

                            {calendarDays.map(day => {
                                const dayEvents = events.filter(e => isSameDay(safeDate(e.dateTime), day));
                                const isToday = isSameDay(new Date(), day);

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => dayEvents[0] && handleEventClick(dayEvents[0])}
                                        className={`aspect-square flex flex-col p-4 font-bold relative rounded-2xl cursor-pointer border transition-all group ${
                                            isToday 
                                            ? "bg-tatt-lime border-tatt-lime-dark/20 text-tatt-green-deep shadow-lg shadow-tatt-lime/20" 
                                            : "bg-background border-border hover:border-tatt-lime/50 hover:bg-surface/50"
                                        }`}
                                    >
                                        <span className="text-xl">{format(day, "d")}</span>
                                        <div className="mt-auto flex flex-wrap gap-1">
                                            {dayEvents.slice(0, 3).map((e, i) => (
                                                <div key={i} className={`size-2 rounded-full ${isToday ? 'bg-tatt-green-deep' : 'bg-tatt-lime'}`}></div>
                                            ))}
                                            {dayEvents.length > 3 && <span className="text-[9px]">+ {dayEvents.length - 3}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    
                    <aside className="xl:col-span-1 space-y-8">
                        <div className="bg-tatt-black rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                            <div className="relative z-10">
                                <h3 className="text-xl font-black uppercase tracking-tight mb-6">Agenda Spotlight</h3>
                                <div className="space-y-6">
                                    {events
                                        .filter(e => new Date(e.dateTime) >= new Date())
                                        .slice(0, 4)
                                        .map(event => (
                                            <div
                                                key={event.id}
                                                onClick={() => handleEventClick(event)}
                                                className="group cursor-pointer"
                                            >
                                                <div className="flex flex-col gap-0.5 mb-1">
                                                    <span className="text-[10px] font-black tracking-widest text-tatt-lime uppercase">
                                                        Native: {formatInTimezone(event.dateTime, event.timezone || 'America/Los_Angeles')}
                                                    </span>
                                                    <span className="text-[10px] font-bold tracking-wider text-white/60">
                                                        Local: {formatLocalTime(event.dateTime)}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold group-hover:text-tatt-lime transition-colors">{event.title}</h4>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="absolute -right-10 -bottom-10 opacity-10">
                                <CalendarIcon size={160} />
                            </div>
                        </div>
                    </aside>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-[400px] bg-surface rounded-[32px] animate-pulse border border-border"></div>
                        ))
                    ) : events.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-tatt-gray italic border-2 border-dashed border-border rounded-[40px] opacity-40">
                             No events in established protocols. Initialize your first gathering.
                        </div>
                    ) : (
                        events.map(event => (
                            <EventCard key={event.id} event={event} onEdit={(e) => handleEditClick(event, e)} onClick={() => handleEventClick(event)} onDelete={(e) => handleDeleteEvent(event.id, e)} />
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-surface rounded-3xl border border-border shadow-xl overflow-hidden">
                        <div className="p-8 bg-surface/50 border-b border-border flex flex-wrap items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Management Directory</h2>
                                <p className="text-tatt-gray text-sm font-medium">Archive of all past and scheduled community gatherings.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <input
                                        className="pl-12 pr-6 py-3.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-tatt-lime/50 w-80 font-bold transition-all transition-all placeholder:text-tatt-gray/40"
                                        placeholder="Filter events directory..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-border/10 text-tatt-gray text-[10px] font-black uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-5">Event Signature</th>
                                        <th className="px-8 py-5">Timeline</th>
                                        <th className="px-8 py-5">Logistic Unit</th>
                                        <th className="px-8 py-5">Classification</th>
                                        <th className="px-8 py-5">Protocol</th>
                                        <th className="px-8 py-5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {events.map(event => (
                                        <tr
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className="hover:bg-tatt-lime/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground group-hover:text-tatt-lime transition-colors">{event.title}</span>
                                                    <span className="text-[10px] font-black text-tatt-gray uppercase tracking-tighter opacity-60">Revenue Unit: ${Number(event.basePrice).toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs font-bold text-foreground">
                                                    Native: {formatInTimezone(event.dateTime, event.timezone || 'America/Los_Angeles')}
                                                </div>
                                                <div className="text-[10px] text-tatt-lime font-bold mt-1">
                                                    Local: {formatLocalTime(event.dateTime)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-foreground">
                                                    {event.locations && event.locations.length > 0 ? (
                                                        event.locations.length === 1 ? event.locations?.[0]?.chapter?.name : `${event.locations.length} Locations`
                                                    ) : "All Chapters"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${getTypeBadgeClass(event.type)}`}>
                                                    {event.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    {event.isForAllMembers ? <Globe className="size-3 text-tatt-lime" /> : <Lock className="size-3 text-tatt-bronze" />}
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${event.isForAllMembers ? "text-tatt-lime" : "text-tatt-bronze"}`}>
                                                        {event.isForAllMembers ? "Public Domain" : "Tier Restricted"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleEditClick(event, e)} className="p-2 hover:bg-tatt-lime/10 text-tatt-gray hover:text-tatt-lime rounded-lg transition-all"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => handleDeleteEvent(event.id, e)} className="p-2 hover:bg-red-500/10 text-tatt-gray hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/60 backdrop-blur-sm">
                    <div className="bg-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-border flex items-center justify-between bg-background/50">
                            <div>
                                <h2 className="text-2xl font-black italic text-foreground uppercase tracking-tight">{isEditMode ? 'Modify Narrative' : 'Establish Event'}</h2>
                                <p className="text-xs text-tatt-gray font-bold uppercase tracking-widest mt-1">Configure signature activity parameters.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="bg-background hover:bg-surface h-10 w-10 flex items-center justify-center rounded-2xl border border-border text-tatt-gray hover:text-foreground transition-all">
                                <X className="size-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar scrollbar-hide">
                            <div className="space-y-1">
                                <label className="text-sm font-bold">Event Title</label>
                                <input
                                    required
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tatt-lime"
                                    placeholder="e.g. Pan-African AI Symposium"
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
                                    placeholder="Tell members about the event..."
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
                                        onChange={e => setForm({ ...form, basePrice: parseFloat(e.target.value) })}
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

                            {!form.isForAllMembers && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Target Tiers (Select at least one)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["FREE", "UBUNTU", "IMANI", "KIONGOZI"].map(tier => (
                                            <button
                                                key={tier}
                                                type="button"
                                                onClick={() => {
                                                    const tiers = form.targetMembershipTiers.includes(tier)
                                                        ? form.targetMembershipTiers.filter(t => t !== tier)
                                                        : [...form.targetMembershipTiers, tier];
                                                    setForm({ ...form, targetMembershipTiers: tiers });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.targetMembershipTiers.includes(tier)
                                                    ? "bg-tatt-lime text-tatt-black border-tatt-lime shadow-lg shadow-tatt-lime/20"
                                                    : "bg-background text-tatt-gray border-border hover:border-tatt-lime/50"
                                                    }`}
                                            >
                                                {tier}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold">Locations & Chapters</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, locations: [...form.locations, { chapterId: availableChapters[0]?.id || "", address: "" }] })}
                                        className="text-xs font-bold text-tatt-lime-dark hover:underline flex items-center gap-1"
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
                                                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs"
                                            >
                                                {user?.systemRole === 'REGIONAL_ADMIN' 
                                                    ? availableChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                                    : chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                            className="p-2 text-tatt-bronze hover:bg-tatt-yellow/10 rounded-lg transition-colors"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-border flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-tatt-lime text-tatt-green-deep font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-tatt-lime/20"
                                >
                                    {isEditMode ? 'Update Event' : 'Schedule Event'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-8 border border-border font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-border/30 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Event Details and Attendees Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/80 backdrop-blur-sm">
                    <div className="bg-surface w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Hero Header */}
                        <div className="relative h-48 bg-tatt-lime-light/30">
                            {selectedEvent.imageUrl ? (
                                <Image src={selectedEvent.imageUrl} alt={selectedEvent.title} fill className="object-cover" />
                            ) : (
                                <div className="size-full flex items-center justify-center font-black text-tatt-lime/30 text-4xl uppercase tracking-tighter italic">
                                    {selectedEvent.title}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 size-10 rounded-full bg-tatt-black/20 hover:bg-tatt-black/40 text-tatt-white flex items-center justify-center backdrop-blur-md transition-all z-10"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="px-8 pb-8 -mt-12 relative z-10 flex-1 overflow-y-auto scrollbar-hide">
                            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                                <div className="space-y-1">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${getTypeBadgeClass(selectedEvent.type)}`}>
                                        {selectedEvent.type}
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground">{selectedEvent.title}</h2>
                                    <div className="flex flex-col gap-1 text-xs font-bold text-tatt-gray">
                                        <span className="flex items-center gap-1.5 text-foreground">
                                            <CalendarIcon className="size-3.5 text-tatt-lime-dark" />
                                            Native: {formatInTimezone(selectedEvent.dateTime, selectedEvent.timezone || 'America/Los_Angeles')}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-tatt-lime">
                                            <Clock className="size-3.5 text-tatt-lime" />
                                            Local: {formatLocalTime(selectedEvent.dateTime)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="size-3.5 text-tatt-lime-dark" />
                                            {selectedEvent.locations?.[0]?.address || "Location TBA"}
                                        </span>
                                    </div>
                                </div>
                                    <div className="bg-surface p-4 rounded-2xl shadow-sm border border-border text-center min-w-[120px]">
                                        <p className="text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-1">Total Attendees</p>
                                        <p className="text-3xl font-black text-foreground">{attendees.length}</p>
                                    </div>
                                    <div className="bg-tatt-lime-light/20 p-4 rounded-2xl shadow-sm border border-tatt-lime/20 text-center min-w-[120px]">
                                        <p className="text-[10px] font-black text-tatt-lime-dark uppercase tracking-widest mb-1">Total Revenue</p>
                                        <p className="text-3xl font-black text-tatt-green-deep">
                                            ${attendees.reduce((acc, reg) => acc + (Number(reg.amountPaid) || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-tatt-lime-dark mb-3">About the Event</h3>
                                        <p className="text-sm text-tatt-gray leading-relaxed font-medium">
                                            {selectedEvent.description}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-tatt-lime-dark mb-3">Locations</h3>
                                        <div className="space-y-3">
                                            {selectedEvent.locations?.map((loc, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                                                    <div className="size-10 bg-tatt-lime-light rounded-lg flex items-center justify-center text-tatt-lime-dark">
                                                        <Building2 className="size-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold">{loc.chapter?.name}</p>
                                                        <p className="text-[10px] text-tatt-gray">{loc.address}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedEvent.locations || selectedEvent.locations.length === 0) && (
                                                <p className="text-xs text-tatt-gray italic">Global / All Chapters</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-tatt-lime-dark mb-3">Registered Members</h3>
                                    <div className="bg-background rounded-2xl border border-border overflow-hidden">
                                        <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                                            {loadingAttendees ? (
                                                <div className="p-8 text-center text-tatt-gray">
                                                    <Loader2 className="size-5 animate-spin mx-auto" />
                                                </div>
                                            ) : attendees.length === 0 ? (
                                                <div className="p-8 text-center text-tatt-gray text-xs italic">
                                                    No registrations yet.
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-border">
                                                    {attendees.map(reg => (
                                                        <div key={reg.id} className="p-3 flex items-center gap-3 hover:bg-border/20 transition-colors">
                                                            <div className="relative size-10 rounded-full overflow-hidden border border-border">
                                                                {reg.user.profilePicture ? (
                                                                    <Image src={reg.user.profilePicture} alt={reg.user.firstName} fill className="object-cover" />
                                                                ) : (
                                                                    <div className="size-full bg-tatt-lime-light flex items-center justify-center text-tatt-green-deep font-bold text-xs uppercase">
                                                                        {reg.user.firstName?.charAt(0)}{reg.user.lastName?.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold truncate">{reg.user.firstName} {reg.user.lastName}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-surface border border-border">
                                                                        {reg.user.communityTier}
                                                                    </span>
                                                                    <span className="text-[9px] text-tatt-gray truncate">{reg.user.professionTitle || "Member"}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-xs font-black text-tatt-green-deep">${Number(reg.amountPaid).toFixed(2)}</p>
                                                                <p className="text-[8px] text-tatt-gray mt-0.5 uppercase font-bold">{reg.isBusinessRegistration ? "Business" : "Individual"}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EventCard({ event, onClick, onEdit, onDelete }: { event: Event, onClick: () => void, onEdit: (e: any) => void, onDelete: (e: any) => void }) {
    const eventDateStr = dayjs(event.dateTime).format("MMM D, YYYY");
    const nativeTimeOnly = dayjs(event.dateTime).tz(event.timezone || 'America/Los_Angeles').format("h:mm A z");
    const localTimeOnly = formatLocalTimeString(event.dateTime);
    const primaryLocation = event.locations?.[0];
    const fullAddress = primaryLocation?.address || "Global Virtual Event";
    const chapterName = primaryLocation?.chapter?.name || "Global Network";

    return (
        <article 
            onClick={onClick}
            className="group relative bg-surface border border-border rounded-[32px] overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-tatt-lime/10 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between"
        >
            <div>
                {/* Hero Banner Header */}
                <div className="relative h-52 w-full bg-tatt-black overflow-hidden">
                    {event.imageUrl ? (
                        <Image src={event.imageUrl} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                    ) : (
                        <div className="size-full bg-gradient-to-br from-tatt-black via-surface to-tatt-black flex items-center justify-center">
                            <CalendarIcon className="size-14 text-tatt-lime/20" />
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-tatt-black via-tatt-black/40 to-transparent"></div>

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-tatt-black/80 backdrop-blur-md text-tatt-lime text-[9px] font-black uppercase tracking-widest rounded-full border border-tatt-lime/20 shadow-md">
                            {event.type}
                        </span>
                        <span className="px-3 py-1 bg-tatt-lime text-tatt-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">
                            {event.registrationsCount || 0} Registered
                        </span>
                    </div>

                    {/* Edit & Delete Quick Action Controls */}
                    <div className="absolute top-4 right-4 z-20 flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(e); }}
                            className="bg-tatt-black/80 hover:bg-tatt-lime text-white hover:text-tatt-black p-2.5 rounded-xl transition-all border border-white/10 cursor-pointer active:scale-95 shadow-md"
                            title="Edit Event"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                            className="bg-tatt-black/80 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all border border-white/10 cursor-pointer active:scale-95 shadow-md"
                            title="Delete Event"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-4 left-6 right-6 z-10">
                        <h3 className="text-lg font-black text-white leading-tight uppercase tracking-tight group-hover:text-tatt-lime transition-colors line-clamp-2">
                            {event.title}
                        </h3>
                    </div>
                </div>

                {/* Content Details */}
                <div className="p-6 space-y-4">
                    {/* Time & Date Section */}
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2.5 font-bold text-foreground">
                            <CalendarIcon size={15} className="text-tatt-lime shrink-0" />
                            <span>{eventDateStr}</span>
                        </div>
                        <div className="flex items-center gap-2.5 font-medium text-tatt-gray flex-wrap">
                            <Clock size={15} className="text-tatt-lime shrink-0" />
                            <span className="text-tatt-lime font-bold">{nativeTimeOnly}</span>
                            <span className="opacity-40">•</span>
                            <span className="text-foreground/80 font-medium">{localTimeOnly} Local</span>
                        </div>
                    </div>

                    {/* Location & Full Address Section (Flexible long address handling) */}
                    <div className="flex items-start gap-2.5 text-tatt-gray border-t border-border/40 pt-3">
                        <MapPin size={16} className="text-tatt-lime shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-tatt-lime block mb-0.5">
                                {chapterName}
                            </span>
                            <p className="text-xs font-medium text-foreground leading-relaxed break-words line-clamp-3 hover:line-clamp-none transition-all">
                                {fullAddress}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Pricing & CTA */}
            <div className="p-6 pt-0">
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                        <DollarSign size={15} className="text-tatt-lime" />
                        <span className="text-base font-black text-foreground">
                            {Number(event.basePrice) > 0 ? `$${Number(event.basePrice).toFixed(2)}` : "Free"}
                        </span>
                        <span className="text-[8px] font-black text-tatt-gray uppercase tracking-widest opacity-60">Entry</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-tatt-lime group-hover:translate-x-1 transition-transform">
                        <span>Manage</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </article>
    );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
    return (
        <div className="bg-surface p-6 rounded-[32px] border border-border group hover:border-tatt-lime/30 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-tatt-lime/10 rounded-2xl text-tatt-lime group-hover:bg-tatt-lime group-hover:text-tatt-black transition-all">{icon}</span>
                <span className="text-tatt-lime text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    {trend} <TrendingUp className="size-3" />
                </span>
            </div>
            <p className="text-tatt-gray text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">{label}</p>
            <p className="text-3xl font-black mt-2 tracking-tighter text-foreground">{value}</p>
        </div>
    );
}
