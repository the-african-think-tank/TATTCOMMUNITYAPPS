"use client";

import { useAuth } from "@/context/auth-context";
import {
    useConnections,
    useConnectionRequests,
    useUpcomingEvents,
    useUnreadMessageCount,
    useVolunteerStats,
} from "@/hooks/use-queries";
import api from "@/services/api";
import { useEffect, useState } from "react";
import {
    Calendar as CalendarIcon,
    Users,
    Megaphone,
    Search,
    UserCheck,
    Mail,
    ClipboardList,
    Shield,
    FileText,
    Award,
    MessageSquare,
    Download,
    ChevronDown,
    Loader2,
    Lock,
    Handshake
} from "lucide-react";


import Link from "next/link";
import MembershipCard from "@/components/molecules/MembershipCard";
import { MemberBenefits } from "@/components/organisms/member-benefits";

const safeDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch {
        return new Date();
    }
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loadingPartnerships, setLoadingPartnerships] = useState(true);

    useEffect(() => {
        const fetchPartnerships = async () => {
            try {
                const { data } = await api.get("/partnerships/my-benefits");
                setPartnerships(data);
            } catch (error) {
                console.error("Failed to fetch dashboard partnerships:", error);
            } finally {
                setLoadingPartnerships(false);
            }
        };
        if (user) fetchPartnerships();
    }, [user]);

    // ── TanStack Query hooks ────────────────────────────────────────────────
    const { data: connectionData, isLoading: networkLoading } = useConnections();
    const { data: connectionRequests, isLoading: requestsLoading } = useConnectionRequests();
    const { data: eventsData, isLoading: eventsLoading } = useUpcomingEvents(true);
    const { data: unreadCount, isLoading: messagesLoading } = useUnreadMessageCount();
    const { data: volunteerData, isLoading: volunteerLoading } = useVolunteerStats();

    const statsLoading = requestsLoading || messagesLoading || eventsLoading || volunteerLoading;
    const connectionCount = Array.isArray(connectionData) ? connectionData.length : 0;
    const pendingConnectionsCount = Array.isArray(connectionRequests) ? connectionRequests.length : 0;

    const allUpcoming = Array.isArray(eventsData)
        ? [...eventsData].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
        : [];

    const chapterEvents = user?.chapterId
        ? allUpcoming.filter((e) => e.locations?.some((l: any) => l.chapterId === user.chapterId))
        : allUpcoming;

    const dashboardEvents = (chapterEvents.length > 0 ? chapterEvents : allUpcoming).slice(0, 2);

    const isUserVolunteer =
        user?.flags?.includes("VOLUNTEER") ||
        ["ADMIN", "SUPERADMIN", "VOLUNTEER_ADMIN"].includes(user?.systemRole || "");

    const stats = {
        upcomingChapterEvents: chapterEvents.length,
        pendingConnections: pendingConnectionsCount,
        unreadMessages: unreadCount ?? 0,
        volunteerValue: isUserVolunteer
            ? volunteerData?.pendingActivities ?? 0
            : volunteerData?.neededRoles ?? 0,
        isVolunteer: isUserVolunteer,
    };

    const isStaff = !!(user?.systemRole && user.systemRole !== "COMMUNITY_MEMBER");
    const isProfileComplete = isStaff || !!(user?.flags && Array.isArray(user.flags) && user.flags.includes("PROFILE_COMPLETED"));

    // ── Display values ─────────────────────────────────────────────────────
    const firstName = user?.firstName || "Member";

    const tier = user?.communityTier || "FREE";
    const displayTierName =
        tier === "KIONGOZI"
            ? "Kiongozi Business"
            : `${tier.charAt(0)}${tier.slice(1).toLowerCase()}`;
    const chapterName = user?.chapterName || "—";
    const memberId = user?.tattMemberId || (user?.id ? `MEM-2024-${user.id.slice(0, 4)}` : "MEM-2024-0000");
    const initials =
        user?.firstName && user?.lastName
            ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
            : "M";
    const companyName = user?.companyName || "—";

    return (
        <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Welcome */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                        Welcome back, {firstName}!
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-tatt-lime text-tatt-black text-xs font-black uppercase rounded shadow-sm">
                            {displayTierName}
                        </span>
                        <span className="text-tatt-gray text-sm font-medium">• {chapterName}</span>
                    </div>
                </div>
                {user?.id ? (
                    <Link
                        href={`/dashboard/network/${user.id}`}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${
                            isProfileComplete 
                                ? "bg-foreground text-background hover:scale-[1.02] active:scale-95" 
                                : "bg-surface border border-border text-tatt-gray hover:bg-black/5"
                        }`}
                    >
                        {isProfileComplete ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {isProfileComplete ? "View Public Profile" : "Profile Setup Pending"}
                    </Link>
                ) : null}

            </div>

            {/* Profile Setup Banner for New Members */}
            {!isProfileComplete && (
                <div className="bg-tatt-lime/10 border border-tatt-lime/30 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-black text-foreground text-lg flex items-center gap-2">
                            <span className="bg-tatt-lime text-tatt-black p-1 rounded-full">
                                <Award className="h-4 w-4" />
                            </span>
                            Complete your profile!
                        </h3>
                        <p className="text-tatt-gray text-sm font-medium mt-1">
                            Your profile is currently missing some key information like your profession, bio, or interests. 
                            Complete these details to unlock your public profile and connect with the community.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/settings"
                        className="shrink-0 px-6 py-2.5 bg-tatt-lime text-tatt-black font-black uppercase text-xs rounded-lg hover:brightness-105 transition-all shadow-sm"
                    >
                        Complete Profile
                    </Link>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-tatt-lime bg-tatt-lime/10 p-2 rounded-lg">
                            <CalendarIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Soon</span>
                    </div>
                    <p className="text-tatt-gray text-sm font-medium">Chapter Events</p>
                    <p className="text-3xl font-black text-foreground">
                        {statsLoading ? "—" : stats.upcomingChapterEvents}
                    </p>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-tatt-lime bg-tatt-lime/10 p-2 rounded-lg">
                            <Users className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            {networkLoading ? "…" : "+5%"}
                        </span>
                    </div>
                    <p className="text-tatt-gray text-sm font-medium">Network Connections</p>
                    <p className="text-3xl font-black text-foreground">
                        {networkLoading ? "—" : connectionCount}
                    </p>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-tatt-lime bg-tatt-lime/10 p-2 rounded-lg">
                            <Mail className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-tatt-lime bg-tatt-lime/10 px-2 py-1 rounded">
                            Action Needed
                        </span>
                    </div>
                    <p className="text-tatt-gray text-sm font-medium">Pending Connections & Messages</p>
                    <p className="text-3xl font-black text-foreground">
                        {statsLoading ? "—" : stats.pendingConnections + stats.unreadMessages}
                    </p>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm bg-gradient-to-br from-surface to-tatt-lime/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-tatt-lime bg-tatt-lime/10 p-2 rounded-lg">
                            <ClipboardList className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-tatt-lime bg-tatt-lime/10 px-2 py-1 rounded">
                            Volunteer Feed
                        </span>
                    </div>
                    <p className="text-tatt-gray text-sm font-medium">
                        {stats.isVolunteer ? "Pending Activities" : "Needed Volunteer Roles"}
                    </p>
                    <p className="text-3xl font-black text-foreground">
                        {volunteerLoading ? "—" : stats.volunteerValue}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: DBU Academy, Business Spotlight, Benefits */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Available Partners */}
                    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-lg bg-foreground flex items-center justify-center text-tatt-lime shrink-0">
                                    <Handshake className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground tracking-tight">Available Partners</h3>
                                    <p className="text-xs text-tatt-gray font-medium">Curated benefits &amp; offers from TATT partners</p>
                                </div>
                            </div>
                            <Link href="/dashboard/partnerships" className="text-[10px] font-black text-tatt-lime hover:underline uppercase tracking-widest shrink-0">
                                View All
                            </Link>
                        </div>

                        <div className="p-4 space-y-3">
                            {loadingPartnerships ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-background rounded-xl animate-pulse border border-border" />
                                ))
                            ) : partnerships.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center text-center text-tatt-gray">
                                    <Handshake className="size-10 opacity-20 mb-3" />
                                    <p className="text-sm font-bold">No partners available yet</p>
                                    <p className="text-xs mt-1 italic">Check back soon — new partnerships are added regularly.</p>
                                </div>
                            ) : (
                                partnerships.slice(0, 4).map((p) => (
                                    <div
                                        key={p.id}
                                        className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                                            p.isLocked
                                                ? "bg-background border-border"
                                                : "bg-surface border-border hover:border-tatt-lime hover:shadow-sm"
                                        }`}
                                    >
                                        {/* Logo */}
                                        <div className={`size-12 rounded-lg border border-border flex items-center justify-center overflow-hidden shrink-0 ${p.isLocked ? "grayscale opacity-60" : "bg-background"}`}>
                                            {p.logoUrl ? (
                                                <img src={p.logoUrl} alt={p.name} className="size-full object-cover" />
                                            ) : (
                                                <Handshake className="size-5 text-tatt-gray" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold text-sm truncate ${p.isLocked ? "text-tatt-gray" : "text-foreground"}`}>{p.name}</h4>
                                                {p.isLocked && <Lock size={11} className="text-tatt-gray shrink-0" />}
                                            </div>
                                            <p className="text-[11px] text-tatt-gray mt-0.5 line-clamp-1 font-medium leading-snug">{p.description}</p>
                                            <span className="mt-1.5 inline-block text-[9px] font-black uppercase tracking-widest text-tatt-lime">{p.category}</span>
                                        </div>

                                        {/* CTA */}
                                        <div className="shrink-0">
                                            {p.isLocked ? (
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <Link
                                                        href={`/dashboard/partnerships/${p.id}`}
                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border border-border bg-surface text-foreground hover:bg-foreground hover:text-background transition-all"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <Link href="/dashboard/upgrade" className="text-[9px] font-bold text-tatt-gray hover:text-tatt-lime transition-colors underline uppercase tracking-wider">
                                                        Upgrade to unlock
                                                    </Link>
                                                </div>
                                            ) : (
                                                <Link
                                                    href={`/dashboard/partnerships/${p.id}`}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-tatt-lime text-tatt-black hover:brightness-105 transition-all shadow-sm"
                                                >
                                                    Access Benefit
                                                </Link>
                                            )}
                                        </div>

                                        {/* Locked overlay shimmer */}
                                        {p.isLocked && (
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Member Benefits */}
                    <MemberBenefits />
                </div>

                {/* Right column */}
                <div className="space-y-8">
                    {/* Digital Membership Card */}
                    {user && (
                        <MembershipCard
                            member={{
                                ...user,
                                id: user.id || "",
                                firstName: user.firstName || "",
                                lastName: user.lastName || "",
                                communityTier: user.communityTier || "FREE",
                                chapterName: user.chapterName || "Global",
                                createdAt: user.createdAt || new Date().toISOString(),
                            }}
                            isCurrentUser={true}
                        />
                    )}

                    {/* Upcoming Events */}
                    <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-foreground">Upcoming Events</h4>
                            <Link href="/dashboard/events" className="text-[10px] font-black text-tatt-lime hover:underline uppercase">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {eventsLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="size-5 animate-spin text-tatt-lime" />
                                </div>
                            ) : dashboardEvents.length === 0 ? (
                                <p className="text-xs text-tatt-gray italic">No upcoming events found.</p>
                            ) : (
                                dashboardEvents.map((event) => (
                                    <Link key={event.id} href="/dashboard/events" className="block group">
                                        <div className="flex gap-3">
                                            <div className="size-10 rounded-lg bg-tatt-black flex flex-col items-center justify-center shrink-0 border border-white/5">
                                                <span className="text-[7px] font-black text-white/50 uppercase leading-none">
                                                    {safeDate(event.dateTime).toLocaleDateString("en-US", { month: "short" })}
                                                </span>
                                                <span className="text-sm font-black text-white leading-none mt-1">
                                                    {safeDate(event.dateTime).getDate()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-xs font-bold text-foreground group-hover:text-tatt-lime transition-colors truncate">
                                                    {event.title}
                                                </h5>
                                                <p className="text-[10px] text-tatt-gray mt-0.5">
                                                    {event.type} • {event.locations?.[0]?.chapter?.name || "Global"}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

