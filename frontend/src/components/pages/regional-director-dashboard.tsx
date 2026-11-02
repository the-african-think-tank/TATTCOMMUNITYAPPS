"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Users,
    HeartHandshake,
    Briefcase,
    ClipboardList,
    Activity,
    Calendar,
    Globe,
    MapPin,
    Plus,
    X,
    ArrowUpRight,
    Loader2,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    Shield,
    Building2,
    Mail,
    Check
} from "lucide-react";
import api from "@/services/api";
import { useAuth, User } from "@/context/auth-context";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Chapter {
    id: string;
    code: string;
    name: string;
    description?: string;
    country?: string;
    stateRegion?: string;
    cities: string[];
    regionalManager?: User;
    associateRegionalDirector?: User;
}

interface ChapterKPIs {
    totalMembers: number;
    activeVolunteers: number;
    openRoles: number;
    pendingApplications: number;
    totalActivities: number;
}

interface DashboardOverviewData {
    chapter: Chapter;
    kpis: ChapterKPIs;
    recentMembers: User[];
    recentActivities: any[];
    openRoles: any[];
    pendingApplications: any[];
}

interface RegionalDirectorDashboardProps {
    initialChapterId?: string;
    isSuperAdminView?: boolean;
}

export function RegionalDirectorDashboard({ initialChapterId, isSuperAdminView }: RegionalDirectorDashboardProps) {
    const router = useRouter();
    const { user } = useAuth();

    // Data States
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [currentChapterId, setCurrentChapterId] = useState<string>(initialChapterId || "");
    const [dashboardData, setDashboardData] = useState<DashboardOverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [selectedRole, setSelectedRole] = useState<any | null>(null);
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({
        name: "",
        weeklyHours: 5,
        durationMonths: 6,
        location: "Hybrid",
        description: "",
        skillsRequired: "",
        openUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false);
    const [activityForm, setActivityForm] = useState({
        title: "",
        content: "",
        type: "ANNOUNCEMENT",
        eventDate: "",
        endDate: "",
        locationType: "PHYSICAL",
        eventLocation: "",
        visibility: "CHAPTER_WIDE",
        targetVolunteers: 0
    });
    const [isCreatingActivity, setIsCreatingActivity] = useState(false);

    // Action execution state
    const [processingAppId, setProcessingAppId] = useState<string | null>(null);

    // 1. Initial Chapter Resolution
    useEffect(() => {
        const resolveChapter = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data: allChaps } = await api.get('/chapters');
                setChapters(allChaps);

                let targetId = initialChapterId;

                if (!targetId) {
                    if (user?.systemRole === 'REGIONAL_ADMIN') {
                        try {
                            const { data: myChap } = await api.get('/chapters/my-chapter');
                            targetId = myChap.id;
                        } catch {
                            if (user?.chapterId) targetId = user.chapterId;
                        }
                    } else if (allChaps.length > 0) {
                        targetId = allChaps[0].id;
                    }
                }

                if (targetId) {
                    setCurrentChapterId(targetId);
                } else {
                    setError("No chapter assigned. Please contact a Superadmin to link your account to a regional chapter.");
                    setIsLoading(false);
                }
            } catch (err: any) {
                console.error("Error resolving chapter:", err);
                setError(err.response?.data?.message || "Failed to load chapter information.");
                setIsLoading(false);
            }
        };

        resolveChapter();
    }, [initialChapterId, user]);

    // 2. Fetch Dashboard Overview Data whenever currentChapterId changes
    const fetchDashboardOverview = useCallback(async () => {
        if (!currentChapterId) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get(`/chapters/${currentChapterId}/dashboard-overview`);
            setDashboardData(data);
        } catch (err: any) {
            console.error("Error loading chapter overview:", err);
            setError(err.response?.data?.message || "Failed to load chapter dashboard.");
        } finally {
            setIsLoading(false);
        }
    }, [currentChapterId]);

    useEffect(() => {
        if (currentChapterId) {
            fetchDashboardOverview();
        }
    }, [currentChapterId, fetchDashboardOverview]);

    // Handle Application Action (Approve / Reject)
    const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
        setProcessingAppId(applicationId);
        const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} candidate...`);
        try {
            const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
            await api.patch(`/volunteers/applications/${applicationId}/status`, { status });
            toast.success(`Candidate ${action === 'approve' ? 'approved as volunteer' : 'rejected'}!`, { id: loadingToast });
            fetchDashboardOverview();
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to ${action} candidate`, { id: loadingToast });
        } finally {
            setProcessingAppId(null);
        }
    };

    // Handle Create Volunteer Role
    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleForm.name.trim() || !roleForm.description.trim()) {
            toast.error("Please fill in role title and description");
            return;
        }
        setIsCreatingRole(true);
        try {
            await api.post('/volunteers/roles', {
                name: roleForm.name.trim(),
                chapterId: currentChapterId,
                weeklyHours: Number(roleForm.weeklyHours),
                durationMonths: Number(roleForm.durationMonths),
                location: roleForm.location,
                description: roleForm.description.trim(),
                openUntil: roleForm.openUntil,
                skillsRequired: roleForm.skillsRequired
                    ? roleForm.skillsRequired.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                isActive: true
            });
            toast.success("Volunteer role published successfully!");
            setIsCreateRoleOpen(false);
            setRoleForm({
                name: "",
                weeklyHours: 5,
                durationMonths: 6,
                location: "Hybrid",
                description: "",
                skillsRequired: "",
                openUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            fetchDashboardOverview();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create role");
        } finally {
            setIsCreatingRole(false);
        }
    };

    // Handle Create Chapter Activity
    const handleCreateActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activityForm.title.trim() || !activityForm.content.trim()) {
            toast.error("Please fill in activity title and details");
            return;
        }
        setIsCreatingActivity(true);
        try {
            await api.post(`/chapters/${currentChapterId}/activities`, {
                ...activityForm,
                targetVolunteers: Number(activityForm.targetVolunteers) || undefined,
                eventDate: activityForm.eventDate || undefined,
                endDate: activityForm.endDate || undefined
            });
            toast.success("Chapter activity posted successfully!");
            setIsCreateActivityOpen(false);
            setActivityForm({
                title: "",
                content: "",
                type: "ANNOUNCEMENT",
                eventDate: "",
                endDate: "",
                locationType: "PHYSICAL",
                eventLocation: "",
                visibility: "CHAPTER_WIDE",
                targetVolunteers: 0
            });
            fetchDashboardOverview();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to post activity");
        } finally {
            setIsCreatingActivity(false);
        }
    };

    // Tier badge helper - simple, unified, monochrome with subtle highlight
    const getTierBadge = (tier?: string) => {
        if (tier === 'KIONGOZI') {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tatt-lime/10 text-tatt-lime border border-tatt-lime/30">
                    Kiongozi
                </span>
            );
        }
        if (tier === 'IMANI' || tier === 'UBUNTU') {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface text-foreground border border-border">
                    {tier.charAt(0) + tier.slice(1).toLowerCase()}
                </span>
            );
        }
        return (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-surface text-tatt-gray border border-border">
                Free
            </span>
        );
    };

    // Loading State
    if (isLoading && !dashboardData) {
        return (
            <div className="flex h-96 w-full flex-col items-center justify-center space-y-4">
                <RefreshCw className="size-8 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-medium text-xs uppercase tracking-widest">Loading Chapter Dashboard...</p>
            </div>
        );
    }

    // Error State
    if (error || !dashboardData) {
        return (
            <div className="flex min-h-[60vh] w-full flex-col items-center justify-center space-y-4 text-center px-6">
                <div className="size-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-tatt-gray">
                    <AlertCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-foreground">Regional Chapter Access</h3>
                <p className="text-tatt-gray max-w-md text-xs sm:text-sm leading-relaxed">{error || "Unable to retrieve chapter details."}</p>
                {chapters.length > 0 && (user?.systemRole === 'SUPERADMIN' || user?.systemRole === 'ADMIN') && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <label className="text-xs uppercase font-medium tracking-wider text-tatt-gray">Select an available chapter:</label>
                        <select
                            value={currentChapterId}
                            onChange={(e) => setCurrentChapterId(e.target.value)}
                            className="h-10 px-4 rounded-xl bg-surface border border-border text-foreground font-medium text-xs outline-none focus:border-tatt-lime cursor-pointer"
                        >
                            {chapters.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        );
    }

    const { chapter, kpis, pendingApplications, openRoles, recentActivities, recentMembers } = dashboardData;
    const canSwitchChapters = Boolean(isSuperAdminView && (user?.systemRole === 'SUPERADMIN' || user?.systemRole === 'ADMIN'));

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
            {/* ─── Chapter Executive Header ─────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-surface border border-border p-5 sm:p-7 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 relative z-10">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground">
                                <Shield size={12} className="text-tatt-lime" />
                                Regional Director Portal
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-background border border-border text-xs font-mono font-medium text-tatt-gray">
                                HUB #{chapter.code}
                            </span>
                            {chapter.country && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-background border border-border text-xs text-tatt-gray">
                                    <Globe size={12} />
                                    {chapter.country} {chapter.stateRegion ? `• ${chapter.stateRegion}` : ''}
                                </span>
                            )}
                        </div>

                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                                {chapter.name}
                            </h1>
                            <p className="text-tatt-gray text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                                {chapter.description || `Leading community expansion, localized volunteer engagement, and regional member impact in ${chapter.name}.`}
                            </p>
                        </div>

                        {chapter.cities && chapter.cities.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-tatt-gray">
                                <MapPin size={12} className="shrink-0" />
                                <span className="font-medium text-foreground">Metropolitan Scope:</span>
                                <span>{chapter.cities.join(", ")}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions & Switcher */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => setIsCreateActivityOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tatt-lime text-tatt-black font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                        >
                            <Plus size={14} />
                            Post Activity / Event
                        </button>
                        <button
                            onClick={() => setIsCreateRoleOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground hover:border-tatt-lime/40 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                        >
                            <Briefcase size={14} className="text-tatt-gray" />
                            Create Volunteer Role
                        </button>

                        {/* Chapter Switcher for Admins in SuperAdmin view */}
                        {canSwitchChapters && (
                            <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-xl border border-border">
                                <Building2 size={15} className="text-tatt-gray shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase font-bold tracking-widest text-tatt-gray">Switch Region</span>
                                    <select
                                        value={currentChapterId}
                                        onChange={(e) => setCurrentChapterId(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer hover:text-tatt-lime transition-colors"
                                    >
                                        {chapters.map((c) => (
                                            <option key={c.id} value={c.id} className="bg-surface text-foreground">
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Chapter KPI Cards (Clean, Unified Monochrome Palette) ──────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* 1. Total Members */}
                <div
                    onClick={() => router.push('/admin/members')}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="size-9 rounded-xl bg-background border border-border text-tatt-gray flex items-center justify-center group-hover:text-tatt-lime group-hover:border-tatt-lime/40 transition-all">
                            <Users size={16} />
                        </div>
                        <ArrowUpRight size={14} className="text-tatt-gray/60 group-hover:text-tatt-lime transition-colors" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                        {kpis.totalMembers.toLocaleString()}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-tatt-gray mt-1">Chapter Members</div>
                    <div className="text-[10px] text-tatt-gray/80 mt-0.5">Active in Hub</div>
                </div>

                {/* 2. Volunteers */}
                <div
                    onClick={() => router.push('/admin/volunteers')}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="size-9 rounded-xl bg-background border border-border text-tatt-gray flex items-center justify-center group-hover:text-tatt-lime group-hover:border-tatt-lime/40 transition-all">
                            <HeartHandshake size={16} />
                        </div>
                        <ArrowUpRight size={14} className="text-tatt-gray/60 group-hover:text-tatt-lime transition-colors" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                        {kpis.activeVolunteers.toLocaleString()}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-tatt-gray mt-1">Volunteers</div>
                    <div className="text-[10px] text-tatt-gray/80 mt-0.5">Engaged Team</div>
                </div>

                {/* 3. Open Roles */}
                <div
                    onClick={() => router.push('/admin/volunteers?tab=roles')}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="size-9 rounded-xl bg-background border border-border text-tatt-gray flex items-center justify-center group-hover:text-tatt-lime group-hover:border-tatt-lime/40 transition-all">
                            <Briefcase size={16} />
                        </div>
                        <ArrowUpRight size={14} className="text-tatt-gray/60 group-hover:text-tatt-lime transition-colors" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                        {kpis.openRoles.toLocaleString()}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-tatt-gray mt-1">Open Roles</div>
                    <div className="text-[10px] text-tatt-gray/80 mt-0.5">Recruiting Now</div>
                </div>

                {/* 4. Pending Applications */}
                <div
                    onClick={() => router.push('/admin/volunteers?tab=applications')}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm active:scale-[0.98] relative"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="size-9 rounded-xl bg-background border border-border text-tatt-gray flex items-center justify-center group-hover:text-tatt-lime group-hover:border-tatt-lime/40 transition-all">
                            <ClipboardList size={16} />
                        </div>
                        {kpis.pendingApplications > 0 ? (
                            <span className="size-2 rounded-full bg-tatt-lime" />
                        ) : (
                            <ArrowUpRight size={14} className="text-tatt-gray/60 group-hover:text-tatt-lime transition-colors" />
                        )}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                        {kpis.pendingApplications.toLocaleString()}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-tatt-gray mt-1">Applications Queue</div>
                    <div className="text-[10px] text-tatt-gray/80 mt-0.5">
                        {kpis.pendingApplications > 0 ? "Awaiting Review" : "Queue Clear"}
                    </div>
                </div>

                {/* 5. Activities & Events */}
                <div
                    onClick={() => setIsCreateActivityOpen(true)}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm active:scale-[0.98] col-span-2 sm:col-span-1"
                >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="size-9 rounded-xl bg-background border border-border text-tatt-gray flex items-center justify-center group-hover:text-tatt-lime group-hover:border-tatt-lime/40 transition-all">
                            <Activity size={16} />
                        </div>
                        <ArrowUpRight size={14} className="text-tatt-gray/60 group-hover:text-tatt-lime transition-colors" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                        {kpis.totalActivities.toLocaleString()}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-tatt-gray mt-1">Chapter Events</div>
                    <div className="text-[10px] text-tatt-gray/80 mt-0.5">Logged Activities</div>
                </div>
            </div>

            {/* ─── Unified 2-Column Actionable Dashboard Grid ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                {/* ─── Left Column (7 cols): Attention & Action Needed ─────────────────── */}
                <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                    {/* Widget 1: Pending Volunteer Applications (Immediate Attention) */}
                    <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-border space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-background border border-border text-foreground flex items-center justify-center">
                                    <ClipboardList size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-bold text-foreground">Pending Applications</h3>
                                    {pendingApplications.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-background text-foreground border border-border">
                                            {pendingApplications.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link
                                href="/admin/volunteers/applications"
                                className="text-xs font-semibold text-tatt-gray hover:text-foreground hover:underline cursor-pointer transition-colors"
                            >
                                View All →
                            </Link>
                        </div>

                        {pendingApplications.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-background border border-dashed border-border text-center space-y-1.5">
                                <CheckCircle2 className="size-7 text-tatt-gray/40 mx-auto" />
                                <p className="text-xs sm:text-sm font-semibold text-foreground">Queue Clear</p>
                                <p className="text-xs text-tatt-gray max-w-sm mx-auto">
                                    All candidates who applied to join your chapter team have been reviewed.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingApplications.slice(0, 5).map((app: any) => (
                                    <div
                                        key={app.id}
                                        className="p-4 sm:p-5 rounded-2xl bg-background border border-border hover:border-tatt-lime/30 transition-all space-y-3"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-xl bg-surface border border-border text-foreground font-bold text-xs flex items-center justify-center shrink-0">
                                                    {app.user?.firstName?.[0] || 'V'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                        {app.user?.firstName} {app.user?.lastName}
                                                    </h4>
                                                    <p className="text-[11px] text-tatt-gray truncate">
                                                        Applying for: <span className="text-foreground font-medium">{app.role?.name || "General Volunteer"}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-tatt-gray shrink-0 self-start sm:self-center">
                                                {format(new Date(app.createdAt), 'MMM d, yyyy')}
                                            </span>
                                        </div>

                                        {app.reasonForApplying && (
                                            <div className="text-xs text-tatt-gray italic line-clamp-2 bg-surface/50 p-2.5 rounded-xl border border-border/60">
                                                &quot;{app.reasonForApplying}&quot;
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
                                            <div className="flex items-center gap-1.5 text-xs text-tatt-gray truncate">
                                                <Mail size={12} className="shrink-0" />
                                                <span className="truncate">{app.user?.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 ml-auto">
                                                <button
                                                    disabled={processingAppId === app.id}
                                                    onClick={() => handleApplicationAction(app.id, 'reject')}
                                                    className="px-3 py-1.5 rounded-xl bg-background border border-border text-tatt-gray hover:text-red-400 hover:border-red-400/30 text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    disabled={processingAppId === app.id}
                                                    onClick={() => handleApplicationAction(app.id, 'approve')}
                                                    className="px-3.5 py-1.5 rounded-xl bg-tatt-lime text-tatt-black text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                                >
                                                    {processingAppId === app.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Check size={12} className="stroke-[3]" />
                                                    )}
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Widget 2: Open Volunteer Positions & Recruitment */}
                    <div id="open-roles-section" className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-border space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-background border border-border text-foreground flex items-center justify-center">
                                    <Briefcase size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-bold text-foreground">Open Roles</h3>
                                    {openRoles.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-background text-foreground border border-border">
                                            {openRoles.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsCreateRoleOpen(true)}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-foreground hover:border-tatt-lime/40 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                                >
                                    <Plus size={12} />
                                    New Role
                                </button>
                                <Link
                                    href="/admin/volunteers?tab=roles"
                                    className="text-xs font-semibold text-tatt-gray hover:text-foreground hover:underline cursor-pointer transition-colors"
                                >
                                    Manage All →
                                </Link>
                            </div>
                        </div>

                        {openRoles.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-background border border-dashed border-border text-center space-y-2">
                                <Briefcase className="size-7 text-tatt-gray/40 mx-auto" />
                                <p className="text-xs sm:text-sm font-semibold text-foreground">No Open Roles</p>
                                <p className="text-xs text-tatt-gray max-w-sm mx-auto">
                                    Recruit volunteers to assist with local events, community mentoring, and chapter expansion.
                                </p>
                                <button
                                    onClick={() => setIsCreateRoleOpen(true)}
                                    className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-background border border-border text-foreground hover:border-tatt-lime/40 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                                >
                                    <Plus size={13} />
                                    Create First Role
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {openRoles.slice(0, 6).map((role: any) => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className="p-4 rounded-2xl bg-background border border-border hover:border-tatt-lime/40 transition-all cursor-pointer group hover:shadow-sm space-y-3 flex flex-col justify-between"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface border border-border text-tatt-gray">
                                                    {role.location || "Hybrid"}
                                                </span>
                                                <span className="text-[11px] font-medium text-tatt-gray">
                                                    {role.weeklyHours} hrs/wk
                                                </span>
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-tatt-lime transition-colors line-clamp-1">
                                                {role.name}
                                            </h4>
                                            <p className="text-xs text-tatt-gray line-clamp-2 leading-relaxed">
                                                {role.description || "Click to view full role responsibilities and requirements."}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-tatt-gray">
                                                <Users size={12} />
                                                <span className="text-foreground font-semibold">{role.applications?.length || 0}</span> candidate(s)
                                            </span>
                                            <span className="text-[11px] text-tatt-gray group-hover:text-tatt-lime font-medium transition-colors flex items-center gap-0.5">
                                                Details
                                                <ArrowUpRight size={13} />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Right Column (5 cols): Chapter Pulse & Community ─────────────────── */}
                <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                    {/* Widget 3: Chapter Events & Upcoming Activities */}
                    <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-border space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-background border border-border text-foreground flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-foreground">Activities & Feed</h3>
                            </div>
                            <button
                                onClick={() => setIsCreateActivityOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border text-foreground hover:border-tatt-lime/40 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                            >
                                <Plus size={12} />
                                Post
                            </button>
                        </div>

                        {recentActivities.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-background border border-dashed border-border text-center space-y-2">
                                <Calendar className="size-7 text-tatt-gray/40 mx-auto" />
                                <p className="text-xs sm:text-sm font-semibold text-foreground">No Activities Logged</p>
                                <p className="text-xs text-tatt-gray max-w-xs mx-auto">
                                    Keep your chapter connected with mixers, townhalls, or community updates.
                                </p>
                                <button
                                    onClick={() => setIsCreateActivityOpen(true)}
                                    className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-tatt-lime text-tatt-black text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                                >
                                    <Plus size={13} />
                                    Post Activity
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentActivities.slice(0, 4).map((act: any) => (
                                    <div
                                        key={act.id}
                                        className="p-4 rounded-2xl bg-background border border-border hover:border-tatt-lime/30 transition-all space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-tatt-gray">
                                                {act.type?.replace('_', ' ')}
                                            </span>
                                            <span className="text-[11px] text-tatt-gray">
                                                {format(new Date(act.createdAt), 'MMM d, yyyy')}
                                            </span>
                                        </div>

                                        <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">{act.title}</h4>
                                        <p className="text-xs text-tatt-gray line-clamp-2 leading-relaxed">{act.content}</p>

                                        {(act.eventDate || act.eventLocation) && (
                                            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-3 text-xs text-tatt-gray">
                                                {act.eventDate && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {format(new Date(act.eventDate), 'MMM d, h:mm a')}
                                                    </div>
                                                )}
                                                {act.eventLocation && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        <span className="truncate max-w-[160px]">{act.eventLocation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Widget 4: Newly Joined Chapter Members */}
                    <div id="recent-members-section" className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface border border-border space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-background border border-border text-foreground flex items-center justify-center">
                                    <Users size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-bold text-foreground">Recent Members</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-background text-tatt-gray border border-border">
                                        {kpis.totalMembers}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href="/admin/members"
                                className="text-xs font-semibold text-tatt-gray hover:text-foreground hover:underline cursor-pointer transition-colors"
                            >
                                Directory →
                            </Link>
                        </div>

                        {recentMembers.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-background border border-dashed border-border text-center space-y-1.5">
                                <Users className="size-7 text-tatt-gray/40 mx-auto" />
                                <p className="text-xs sm:text-sm font-semibold text-foreground">No Recent Arrivals</p>
                                <p className="text-xs text-tatt-gray max-w-xs mx-auto">
                                    No new members have joined this regional chapter yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {recentMembers.slice(0, 6).map((member: User) => (
                                    <div
                                        key={member.id}
                                        className="p-3 rounded-2xl bg-background border border-border flex items-center justify-between gap-3 hover:border-border/80 transition-all"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="size-8 rounded-xl bg-surface border border-border text-foreground font-bold flex items-center justify-center text-xs shrink-0">
                                                {member.firstName?.[0] || 'U'}{member.lastName?.[0] || ''}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                                    {member.firstName} {member.lastName}
                                                </h4>
                                                <p className="text-[11px] text-tatt-gray truncate">
                                                    {member.professionTitle || member.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {getTierBadge(member.communityTier)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── MODAL: CREATE VOLUNTEER ROLE ────────────────────────────────────── */}
            {isCreateRoleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border w-full max-w-lg rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Briefcase size={18} />
                                Create Volunteer Role — {chapter.name}
                            </h3>
                            <button
                                onClick={() => setIsCreateRoleOpen(false)}
                                className="text-tatt-gray hover:text-foreground cursor-pointer p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                    Role Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                    placeholder="e.g. Chapter Youth Program Lead"
                                    className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Hours / Week
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={40}
                                        value={roleForm.weeklyHours}
                                        onChange={(e) => setRoleForm({ ...roleForm, weeklyHours: Number(e.target.value) })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Duration (Months)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={roleForm.durationMonths}
                                        onChange={(e) => setRoleForm({ ...roleForm, durationMonths: Number(e.target.value) })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Location Type
                                    </label>
                                    <select
                                        value={roleForm.location}
                                        onChange={(e) => setRoleForm({ ...roleForm, location: e.target.value })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime cursor-pointer"
                                    >
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="Remote">Remote</option>
                                        <option value="On-Site">On-Site</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Application Deadline
                                    </label>
                                    <input
                                        type="date"
                                        value={roleForm.openUntil}
                                        onChange={(e) => setRoleForm({ ...roleForm, openUntil: e.target.value })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                    Required Skills (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={roleForm.skillsRequired}
                                    onChange={(e) => setRoleForm({ ...roleForm, skillsRequired: e.target.value })}
                                    placeholder="e.g. Event Coordination, Mentorship, Communication"
                                    className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                    Role Description & Responsibilities *
                                </label>
                                <textarea
                                    rows={4}
                                    required
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                    placeholder="Describe the mission, impact, and expectations of this chapter volunteer position..."
                                    className="w-full p-3.5 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateRoleOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-background border border-border text-foreground font-semibold text-xs uppercase tracking-wider hover:bg-surface cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingRole}
                                    className="px-5 py-2 rounded-xl bg-tatt-lime text-tatt-black font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isCreatingRole && <Loader2 size={13} className="animate-spin" />}
                                    Publish Role
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: CREATE CHAPTER ACTIVITY ──────────────────────────────────── */}
            {isCreateActivityOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border w-full max-w-lg rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Activity size={18} />
                                Post Activity — {chapter.name}
                            </h3>
                            <button
                                onClick={() => setIsCreateActivityOpen(false)}
                                className="text-tatt-gray hover:text-foreground cursor-pointer p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateActivity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                    Activity Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={activityForm.title}
                                    onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                                    placeholder="e.g. Regional Networking Breakfast"
                                    className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Type
                                    </label>
                                    <select
                                        value={activityForm.type}
                                        onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime cursor-pointer"
                                    >
                                        <option value="ANNOUNCEMENT">Announcement</option>
                                        <option value="EVENT">Event</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="WORKSHOP">Workshop</option>
                                        <option value="PROJECT">Project</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Visibility
                                    </label>
                                    <select
                                        value={activityForm.visibility}
                                        onChange={(e) => setActivityForm({ ...activityForm, visibility: e.target.value })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime cursor-pointer"
                                    >
                                        <option value="CHAPTER_WIDE">Chapter Members Only</option>
                                        <option value="PUBLIC">Public</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Event Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={activityForm.eventDate}
                                        onChange={(e) => setActivityForm({ ...activityForm, eventDate: e.target.value })}
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                        Location / Venue
                                    </label>
                                    <input
                                        type="text"
                                        value={activityForm.eventLocation}
                                        onChange={(e) => setActivityForm({ ...activityForm, eventLocation: e.target.value })}
                                        placeholder="e.g. Washington Hub, Zoom, etc."
                                        className="w-full h-10 px-4 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium uppercase tracking-wider text-tatt-gray mb-1.5">
                                    Activity Details & Agenda *
                                </label>
                                <textarea
                                    rows={4}
                                    required
                                    value={activityForm.content}
                                    onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                                    placeholder="Provide event details, registration links, or announcement content..."
                                    className="w-full p-3.5 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm outline-none focus:border-tatt-lime resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateActivityOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-background border border-border text-foreground font-semibold text-xs uppercase tracking-wider hover:bg-surface cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingActivity}
                                    className="px-5 py-2 rounded-xl bg-tatt-lime text-tatt-black font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isCreatingActivity && <Loader2 size={13} className="animate-spin" />}
                                    Post Activity
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: ROLE DETAILS & CANDIDATES ─────────────────────────────────── */}
            {selectedRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl my-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-foreground">
                                        {selectedRole.isActive ? "Active / Open" : "Closed"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-medium text-tatt-gray">
                                        {chapter.name}
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                                    {selectedRole.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedRole(null)}
                                className="text-tatt-gray hover:text-foreground cursor-pointer p-1.5 rounded-xl hover:bg-background transition-colors shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-background border border-border text-xs">
                            <div>
                                <span className="text-[10px] uppercase font-medium text-tatt-gray block">Commitment</span>
                                <span className="font-semibold text-foreground">{selectedRole.weeklyHours} hrs/week</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-medium text-tatt-gray block">Duration</span>
                                <span className="font-semibold text-foreground">{selectedRole.durationMonths || 6} Months</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-medium text-tatt-gray block">Location</span>
                                <span className="font-semibold text-foreground">{selectedRole.location || "Hybrid"}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-tatt-gray">Description & Scope</h4>
                            <p className="text-xs sm:text-sm text-tatt-gray leading-relaxed whitespace-pre-line">
                                {selectedRole.description || "No description provided for this role."}
                            </p>
                        </div>

                        {/* Required Skills */}
                        {selectedRole.skillsRequired && selectedRole.skillsRequired.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-tatt-gray">Required Skills</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedRole.skillsRequired.map((skill: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs text-foreground font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Applicants Section */}
                        <div className="space-y-3 pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <ClipboardList size={14} />
                                    Candidates & Applicants ({selectedRole.applications?.length || 0})
                                </h4>
                                <button
                                    onClick={() => router.push(`/admin/volunteers/roles/${selectedRole.id}/applicants`)}
                                    className="text-xs text-tatt-gray hover:text-foreground hover:underline font-semibold cursor-pointer"
                                >
                                    Open Full Pipeline →
                                </button>
                            </div>

                            {(!selectedRole.applications || selectedRole.applications.length === 0) ? (
                                <p className="text-xs text-tatt-gray italic p-4 rounded-xl bg-background border border-border text-center">
                                    No candidates have applied to this chapter role yet.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {selectedRole.applications.map((app: any) => (
                                        <div key={app.id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs">
                                            <div className="truncate">
                                                <p className="font-semibold text-foreground truncate">
                                                    {app.user?.firstName} {app.user?.lastName}
                                                </p>
                                                <p className="text-[10px] text-tatt-gray truncate">{app.user?.email}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface border border-border text-foreground shrink-0">
                                                {app.status || "PENDING"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setSelectedRole(null)}
                                className="px-4 py-2 rounded-xl bg-background border border-border text-foreground font-semibold text-xs uppercase tracking-wider hover:bg-surface transition-all cursor-pointer text-center"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(`/admin/volunteers/roles/${selectedRole.id}/applicants`)}
                                className="px-5 py-2 rounded-xl bg-tatt-lime text-tatt-black font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Users size={14} />
                                Manage Candidates
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
