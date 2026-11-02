"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Clock, 
    ArrowLeft,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    Briefcase,
    Calendar,
    MessageCircle,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    X,
    Info,
    CalendarDays
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/auth-context";

interface Application {
    id: string;
    userId: string;
    reasonForApplying: string;
    interestsAndSkills: string[];
    hoursAvailablePerWeek: number;
    weeklyAvailability: any;
    questionsForAdmin?: string;
    adminNotes?: string;
    status: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
        professionTitle?: string;
        industry?: string;
    };
    role?: {
        name: string;
    };
}

export default function ApplicationsPage() {
    const { user } = useAuth();
    const isRegionalAdmin = user?.systemRole === 'REGIONAL_ADMIN';

    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [totalItems, setTotalItems] = useState(0);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/applications`, {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined,
                    status: 'PENDING',
                    chapterId: isRegionalAdmin ? user?.chapterId : undefined
                }
            });
            setApplications(data.data);
            setTotalPages(data.totalPages);
            setTotalItems(data.total);
        } catch (error) {
            toast.error("Failed to load applications");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [page, search, isRegionalAdmin, user?.chapterId]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} application...`);
        try {
            const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
            await api.patch(`/volunteers/applications/${id}/status`, { status });
            toast.success(`Application ${action}d successfully`, { id: loadingToast });
            fetchApplications();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${action} application`, { id: loadingToast });
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1.5">
                    <Link href="/admin/volunteers" className="inline-flex items-center gap-2 text-xs font-bold text-tatt-lime hover:underline mb-1 cursor-pointer transition-colors">
                        <ArrowLeft size={14} /> Back to Volunteer Center
                    </Link>
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Pending Volunteer Applications</h3>
                        {totalItems > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {totalItems} Pending
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-tatt-gray font-medium">Review and process new candidate applications for your chapter.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tatt-gray" />
                    <input
                        type="text"
                        placeholder="Search by name, role, email..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-tatt-gray focus:outline-none focus:border-tatt-lime transition-all"
                    />
                </div>
            </div>

            {/* Application Cards / Collapsible List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 bg-surface rounded-2xl border border-border">
                        <Loader2 className="animate-spin text-tatt-lime" size={40} />
                        <p className="text-xs font-bold text-tatt-gray">Loading applications...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="py-16 text-center bg-surface rounded-2xl border border-border space-y-2">
                        <p className="text-foreground font-bold text-base">No Pending Applications</p>
                        <p className="text-xs text-tatt-gray">All candidate applications have been processed or none have been submitted yet.</p>
                    </div>
                ) : (
                    applications.map((app) => {
                        const isExpanded = expandedIds.has(app.id);

                        return (
                            <div 
                                key={app.id} 
                                className="bg-surface border border-border rounded-xl transition-all hover:border-border/80 group overflow-hidden"
                            >
                                {/* Collapsed Summary Row */}
                                <div 
                                    onClick={() => toggleExpand(app.id)}
                                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                                >
                                    {/* Left Side: Chevron + Candidate Name & Subtitle */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center text-tatt-gray group-hover:text-foreground shrink-0 transition-all">
                                            <ChevronDown 
                                                size={16} 
                                                className={`transition-transform duration-200 ${isExpanded ? 'rotate-0 text-tatt-lime' : '-rotate-90'}`} 
                                            />
                                        </div>
                                        <div className="min-w-0 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-tatt-lime transition-colors truncate">
                                                    {app.user.firstName} {app.user.lastName}
                                                </h4>
                                                {app.user.professionTitle && (
                                                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-tatt-gray">
                                                        <Briefcase size={11} className="text-tatt-lime" />
                                                        {app.user.professionTitle}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-tatt-gray lowercase truncate">
                                                {app.user.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle Metadata: Target Role, Commitment, Date */}
                                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-tatt-gray">
                                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                                            <Briefcase size={14} className="text-tatt-lime shrink-0" />
                                            <span>{app.role?.name || "General Volunteer"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-tatt-gray shrink-0" />
                                            <span>{app.hoursAvailablePerWeek} hrs/wk</span>
                                        </div>
                                        <div className="hidden md:flex items-center gap-1.5">
                                            <Calendar size={14} className="text-tatt-gray shrink-0" />
                                            <span>Applied {new Date(app.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>

                                    {/* Right Side: Status Badge + 1-Click Quick Action Buttons */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                            Awaiting Review
                                        </span>

                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleAction(app.id, 'reject')}
                                                className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                                                title="Reject Candidate"
                                            >
                                                <XCircle size={14} />
                                                <span className="hidden sm:inline">Reject</span>
                                            </button>
                                            <button
                                                onClick={() => handleAction(app.id, 'approve')}
                                                className="px-3.5 py-1.5 rounded-lg bg-tatt-lime text-tatt-black hover:brightness-105 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shadow-tatt-lime/10 flex items-center gap-1.5"
                                                title="Approve Volunteer"
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>Approve</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Inline Details */}
                                {isExpanded && (
                                    <div className="border-t border-border/60 bg-background/40 p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                            {/* Statement / Reason */}
                                            <div className="lg:col-span-2 space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-tatt-gray">
                                                    <MessageCircle size={14} className="text-tatt-lime" />
                                                    <span>Candidate Statement</span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed pl-3.5 border-l-2 border-tatt-lime">
                                                    "{app.reasonForApplying}"
                                                </p>
                                                {app.questionsForAdmin && (
                                                    <div className="mt-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 border-l-2 border-l-amber-500 text-xs">
                                                        <span className="font-bold text-amber-400 mr-1.5">Note/Question:</span>
                                                        <span className="text-foreground/90">{app.questionsForAdmin}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Skills & Dossier Trigger */}
                                            <div className="space-y-3 lg:border-l lg:border-border/60 lg:pl-5">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-tatt-gray">Skills & Competencies</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {app.interestsAndSkills && app.interestsAndSkills.length > 0 ? (
                                                            app.interestsAndSkills.map((skill, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] text-tatt-gray">
                                                                    {skill}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-tatt-gray">General Support</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedApp(app);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-background hover:border-border/80 transition-all cursor-pointer active:scale-95"
                                                    >
                                                        <MoreHorizontal size={14} />
                                                        <span>View Full Dossier</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination for apps */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                    <button 
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="p-2.5 bg-surface border border-border rounded-xl text-tatt-gray hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-medium text-tatt-gray">
                        Page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                    </span>
                    <button 
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="p-2.5 bg-surface border border-border rounded-xl text-tatt-gray hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Application Detail Modal */}
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0"
                        onClick={() => setSelectedApp(null)}
                    ></div>
                    <div className="relative w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 sm:p-7 border-b border-border bg-background/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-tatt-lime/10 text-tatt-lime flex items-center justify-center font-bold text-lg border border-tatt-lime/20">
                                    {selectedApp.user.firstName.charAt(0)}{selectedApp.user.lastName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                        Application: {selectedApp.user.firstName} {selectedApp.user.lastName}
                                    </h2>
                                    <p className="text-xs text-tatt-gray">Volunteer Candidate Review</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedApp(null)}
                                className="size-9 rounded-lg bg-background border border-border flex items-center justify-center text-tatt-gray hover:text-foreground hover:border-border/80 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 sm:p-7 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-tatt-lime mb-3 flex items-center gap-2">
                                            <Info size={14} /> Applicant Profile
                                        </h4>
                                        <div className="space-y-2.5 p-4 rounded-xl bg-background/40 border border-border/60">
                                            <p className="text-xs font-medium text-tatt-gray">Full Name: <span className="text-foreground font-semibold ml-1">{selectedApp.user.firstName} {selectedApp.user.lastName}</span></p>
                                            <p className="text-xs font-medium text-tatt-gray">Email: <span className="text-foreground font-semibold ml-1">{selectedApp.user.email}</span></p>
                                            <p className="text-xs font-medium text-tatt-gray">Profession: <span className="text-foreground font-semibold ml-1">{selectedApp.user.professionTitle || "Not Specified"}</span></p>
                                            <p className="text-xs font-medium text-tatt-gray">Sector: <span className="text-foreground font-semibold ml-1">{selectedApp.user.industry || "General"}</span></p>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-tatt-lime mb-3 flex items-center gap-2">
                                            <CalendarDays size={14} /> Weekly Availability
                                        </h4>
                                        <div className="bg-background/40 rounded-xl border border-border/60 p-4">
                                            {selectedApp.weeklyAvailability && typeof selectedApp.weeklyAvailability === 'object' ? (
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {Object.entries(selectedApp.weeklyAvailability).map(([day, slots]) => (
                                                        <div key={day} className="flex justify-between items-center p-2 border-b border-border/40 last:border-0">
                                                            <span className="font-semibold text-tatt-lime">{day}</span>
                                                            <span className="text-tatt-gray">{Array.isArray(slots) ? slots.join(', ') : String(slots)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-tatt-gray">No specific availability slots provided.</p>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-tatt-lime mb-3 flex items-center gap-2">
                                            <Briefcase size={14} /> Skills & Interests
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 p-4 rounded-xl bg-background/40 border border-border/60">
                                            {selectedApp.interestsAndSkills && selectedApp.interestsAndSkills.length > 0 ? (
                                                selectedApp.interestsAndSkills.map((interest, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-medium text-foreground">
                                                        {interest}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-tatt-gray">No specific skills listed.</span>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-tatt-lime mb-3 flex items-center gap-2">
                                            <MessageCircle size={14} /> Candidate Statement
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="p-4 bg-background/40 rounded-xl border border-border/60 border-l-2 border-l-tatt-lime italic">
                                                <p className="text-[10px] uppercase font-bold text-tatt-gray mb-1">Reason for Applying</p>
                                                <p className="text-xs text-foreground/90 font-medium leading-relaxed">"{selectedApp.reasonForApplying}"</p>
                                            </div>
                                            {selectedApp.questionsForAdmin && (
                                                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 border-l-2 border-l-amber-500">
                                                    <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Candidate Note / Question</p>
                                                    <p className="text-xs text-foreground/90 font-medium">"{selectedApp.questionsForAdmin}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-border bg-background/50 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    handleAction(selectedApp.id, 'reject');
                                    setSelectedApp(null);
                                }}
                                className="px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 font-semibold text-xs hover:bg-red-500 hover:text-white transition-all cursor-pointer active:scale-95"
                            >
                                Reject Candidate
                            </button>
                            <button 
                                onClick={() => {
                                    handleAction(selectedApp.id, 'approve');
                                    setSelectedApp(null);
                                }}
                                className="px-6 py-2.5 rounded-xl bg-tatt-lime text-tatt-black font-bold text-xs hover:brightness-105 transition-all shadow-md shadow-tatt-lime/10 cursor-pointer active:scale-95"
                            >
                                Approve Volunteer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
