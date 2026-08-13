"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/services/api";
import toast from "react-hot-toast";
import {
    Briefcase, Search, Plus, Eye, Flag, EyeOff, RotateCcw,
    Trash2, Loader2, ChevronLeft, ChevronRight, X, 
    CheckCircle2, AlertTriangle, ShieldAlert, Users,
    MapPin, Clock, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminJob {
    id: string;
    title: string;
    companyName: string;
    companyLogoUrl?: string;
    location: string;
    type: string;
    category: string;
    description?: string;
    salaryLabel?: string;
    salaryMin?: number;
    salaryMax?: number;
    isActive: boolean;
    isFlagged: boolean;
    flagReason?: string;
    isNew: boolean;
    createdAt: string;
    applicationsCount?: number;
    postedBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        communityTier: string;
    };
}

interface Stats {
    total: number;
    active: number;
    inactive: number;
    flagged: number;
    applications: number;
    categories?: { name: string; count: number; percentage: number }[];
}

type ModalMode = "view" | "action" | null;

const CATEGORIES = ["Green Energy", "FinTech", "Sustainability", "Policy & Govt", "AgriTech", "Technology", "NGO", "Finance", "Strategy"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Seasonal", "Internship"];

function initials(name: string) {
    return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function statusBadge(job: AdminJob) {
    if (job.isFlagged) return { label: "Flagged", cls: "bg-red-500/10 text-red-600 border border-red-500/20" };
    if (!job.isActive) return { label: "Unlisted", cls: "bg-tatt-gray/10 text-tatt-gray border border-border" };
    return { label: "Live", cls: "bg-tatt-lime/10 text-tatt-lime-dark border border-tatt-lime/30" };
}

// ── Action Modal ──────────────────────────────────────────────────────────────

function ActionModal({ job, action, onClose, onDone }: {
    job: AdminJob;
    action: "flag" | "unlist" | "restore" | "delete";
    onClose: () => void;
    onDone: () => void;
}) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const config = {
        flag: { title: "Flag Listing", description: "This will flag the listing and notify the poster.", icon: <Flag className="size-5 text-red-500" />, color: "text-red-600", cta: "Flag Listing" },
        unlist: { title: "Unlist Listing", description: "This will remove the job from the board and notify the poster.", icon: <EyeOff className="size-5 text-tatt-gray" />, color: "text-foreground", cta: "Unlist Listing" },
        restore: { title: "Restore Listing", description: "This will make the listing live again and clear any flags.", icon: <RotateCcw className="size-5 text-tatt-lime" />, color: "text-tatt-lime-dark", cta: "Restore Listing" },
        delete: { title: "Delete Permanently", description: "This action cannot be undone. The listing will be deleted forever.", icon: <Trash2 className="size-5 text-red-500" />, color: "text-red-600", cta: "Delete Forever" },
    }[action];

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (action === "flag") await api.patch(`/admin/jobs/${job.id}/flag`, { reason: reason || undefined });
            else if (action === "unlist") await api.patch(`/admin/jobs/${job.id}/unlist`, { reason: reason || undefined });
            else if (action === "restore") await api.patch(`/admin/jobs/${job.id}/restore`);
            else if (action === "delete") await api.delete(`/admin/jobs/${job.id}`);

            toast.success(`Job listing "${job.title}" ${action === "delete" ? "deleted" : action + "ed"} successfully.`);
            onDone();
            onClose();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Action failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-background border border-border flex items-center justify-center">{config.icon}</div>
                            <h2 className="text-base font-black text-foreground">{config.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-lg hover:bg-background text-tatt-gray"><X className="size-4" /></button>
                    </div>

                    <p className="text-sm text-tatt-gray mb-1">
                        <span className="font-bold text-foreground">{job.title}</span> · {job.companyName}
                    </p>
                    <p className="text-xs text-tatt-gray mb-5">{config.description}</p>

                    {(action === "flag" || action === "unlist") && (
                        <div className="mb-5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray block mb-1.5">Reason (optional — sent to poster)</label>
                            <textarea
                                rows={3}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Describe the issue..."
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-tatt-lime"
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-background transition-colors">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                action === "delete" || action === "flag"
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : action === "restore"
                                        ? "bg-tatt-lime text-black hover:brightness-95"
                                        : "bg-foreground text-background hover:opacity-90"
                            } disabled:opacity-60`}
                        >
                            {loading ? <Loader2 className="size-4 animate-spin" /> : config.cta}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function JobDetailDrawer({ job, onClose, onAction }: { job: AdminJob; onClose: () => void; onAction: (action: "flag" | "unlist" | "restore" | "delete") => void }) {
    const badge = statusBadge(job);
    return (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
            <div className="bg-surface w-full max-w-md h-full overflow-y-auto border-l border-border shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
                    <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Job Detail</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-background text-tatt-gray"><X className="size-4" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badge.cls}`}>
                        <span className="size-1.5 rounded-full bg-current" />{badge.label}
                    </span>

                    {/* Title */}
                    <div>
                        <h3 className="text-xl font-black text-foreground leading-tight">{job.title}</h3>
                        <p className="text-sm text-tatt-gray mt-1">{job.companyName}</p>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: <MapPin className="size-3.5" />, label: "Location", value: job.location },
                            { icon: <Briefcase className="size-3.5" />, label: "Type", value: job.type },
                            { icon: <Building2 className="size-3.5" />, label: "Category", value: job.category },
                            { icon: <Clock className="size-3.5" />, label: "Posted", value: new Date(job.createdAt).toLocaleDateString() },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="p-3 rounded-xl bg-background border border-border">
                                <div className="flex items-center gap-1.5 text-tatt-gray mb-1">{icon}<span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div>
                                <p className="text-xs font-bold text-foreground truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Poster */}
                    {job.postedBy && (
                        <div className="p-4 rounded-xl bg-background border border-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Posted By</p>
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime text-xs font-black border border-tatt-lime/20">
                                    {initials(`${job.postedBy.firstName} ${job.postedBy.lastName}`)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{job.postedBy.firstName} {job.postedBy.lastName}</p>
                                    <p className="text-xs text-tatt-gray">{job.postedBy.email}</p>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-tatt-lime bg-tatt-lime/10 px-2 py-0.5 rounded-md">{job.postedBy.communityTier}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Flag reason */}
                    {job.flagReason && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Flag Reason</p>
                            <p className="text-xs text-foreground">{job.flagReason}</p>
                        </div>
                    )}

                    {/* Description */}
                    {job.description && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Description</p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{job.description}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                        {job.isActive && !job.isFlagged && (
                            <button onClick={() => onAction("flag")} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors">
                                <Flag className="size-4" /> Flag Listing
                            </button>
                        )}
                        {job.isActive && (
                            <button onClick={() => onAction("unlist")} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-background border border-border text-foreground font-black text-xs uppercase tracking-widest hover:bg-tatt-gray/10 transition-colors">
                                <EyeOff className="size-4" /> Unlist Listing
                            </button>
                        )}
                        {(!job.isActive || job.isFlagged) && (
                            <button onClick={() => onAction("restore")} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-tatt-lime/10 text-tatt-lime-dark font-black text-xs uppercase tracking-widest hover:bg-tatt-lime/20 transition-colors">
                                <RotateCcw className="size-4" /> Restore Listing
                            </button>
                        )}
                        <button onClick={() => onAction("delete")} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors">
                            <Trash2 className="size-4" /> Delete Permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminJobsCenterPage() {
    const [jobs, setJobs] = useState<AdminJob[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number } | null>(null);

    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [view, setView] = useState<"listings" | "applications">("listings");

    const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
    const [selectedApp, setSelectedApp] = useState<any | null>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [appMeta, setAppMeta] = useState<any>(null);
    const [actionModal, setActionModal] = useState<{ job: AdminJob; action: "flag" | "unlist" | "restore" | "delete" } | null>(null);

    const fetchJobs = useCallback(async () => {
        if (view !== "listings") return;
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 10 };
            if (search) params.search = search;
            if (statusFilter !== "all") params.status = statusFilter;
            if (typeFilter !== "all") params.type = typeFilter;
            const { data } = await api.get("/admin/jobs", { params });
            setJobs(Array.isArray(data?.data) ? data.data : []);
            setMeta(data?.meta ?? null);
        } catch { toast.error("Failed to load job listings."); }
        finally { setLoading(false); }
    }, [page, search, statusFilter, typeFilter, view]);

    const fetchApps = useCallback(async () => {
        if (view !== "applications") return;
        setLoading(true);
        try {
            const { data } = await api.get("/admin/jobs/applications", { params: { page, limit: 10 } });
            setApplications(data.data);
            setAppMeta(data.meta);
        } catch { toast.error("Failed to load applications."); }
        finally { setLoading(false); }
    }, [page, view]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get<Stats>("/admin/jobs/stats");
            setStats(data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);
    useEffect(() => { fetchApps(); }, [fetchApps]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    const refresh = () => { fetchJobs(); fetchApps(); fetchStats(); };

    const TABS = [
        { id: "listings", label: "Job Listings", icon: <Briefcase className="size-4" /> },
        { id: "applications", label: "Applications", icon: <Users className="size-4" /> },
    ];

    const STATUS_FILTERS = [
        { value: "all", label: "All" },
        { value: "active", label: "Live" },
        { value: "inactive", label: "Unlisted" },
        { value: "flagged", label: "Flagged" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-surface px-4 sm:px-8 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">Job Center</h1>
                            <p className="text-tatt-gray text-xs font-medium mt-1">Manage global recruitment and community placements</p>
                        </div>
                        <div className="flex gap-1 bg-background p-1 rounded-xl w-fit border border-border">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setView(tab.id as any); setPage(1); }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        view === tab.id ? "bg-surface text-tatt-lime shadow-sm ring-1 ring-border" : "text-tatt-gray hover:text-foreground"
                                    }`}
                                >
                                    {tab.icon}{tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Link
                        href="/admin/jobs/create"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-tatt-lime text-black font-black text-[10px] uppercase tracking-widest hover:brightness-95 transition-all shadow-xl shadow-tatt-lime/20 self-start sm:self-auto"
                    >
                        <Plus className="size-4" /> Post New Listing
                    </Link>
                </div>
            </div>

            <div className="px-4 sm:px-8 py-6 space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: "Total Listings", value: stats?.total ?? "—", icon: <Briefcase className="size-5" />, accent: "" },
                        { label: "Live Listings", value: stats?.active ?? "—", icon: <CheckCircle2 className="size-5" />, accent: "text-tatt-lime-dark" },
                        { label: "Unlisted", value: stats?.inactive ?? "—", icon: <EyeOff className="size-5" />, accent: "text-tatt-gray" },
                        { label: "Flagged", value: stats?.flagged ?? "—", icon: <ShieldAlert className="size-5" />, accent: "text-red-500" },
                        { label: "Applications", value: stats?.applications ?? "—", icon: <Users className="size-5" />, accent: "text-tatt-bronze" },
                    ].map(({ label, value, icon, accent }) => (
                        <div key={label} className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-gray">{label}</p>
                            <div className="flex items-end justify-between">
                                <span className={`text-2xl sm:text-3xl font-black tracking-tighter ${accent || "text-foreground"}`}>{value}</span>
                                <span className={`${accent || "text-tatt-gray"} opacity-60`}>{icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters + Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2 flex-1">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-tatt-gray pointer-events-none" />
                            <input type="search" placeholder="Search listings by title or company..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-tatt-gray focus:outline-none focus:ring-2 focus:ring-tatt-lime text-sm" />
                        </div>
                        <button type="submit" className="px-4 py-2.5 rounded-xl bg-tatt-lime text-black font-bold text-sm hover:brightness-95">Search</button>
                    </form>

                    {/* Status pills */}
                    <div className="flex gap-2 flex-wrap">
                        {STATUS_FILTERS.map(f => (
                            <button key={f.value} type="button" onClick={() => { setStatusFilter(f.value); setPage(1); }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${statusFilter === f.value ? "bg-tatt-lime text-black border-tatt-lime" : "bg-surface border-border text-tatt-gray hover:border-tatt-lime"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main content split */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Table */}
                    <div className="xl:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden min-h-[500px]">
                        {view === "listings" ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-border bg-background/50">
                                                {["Job Listing", "Posted By", "Apps", "Type", "Posted", "Status", ""].map(h => (
                                                    <th key={h} className="px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-tatt-gray whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {loading ? (
                                                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="size-8 animate-spin text-tatt-lime mx-auto" /><p className="text-[9px] font-black uppercase tracking-widest text-tatt-gray mt-4">Streaming listings...</p></td></tr>
                                            ) : jobs.length === 0 ? (
                                                <tr><td colSpan={6} className="py-20 text-center text-tatt-gray text-sm">No listings found.</td></tr>
                                            ) : jobs.map(job => {
                                                const badge = statusBadge(job);
                                                return (
                                                    <tr key={job.id} className="hover:bg-background/60 transition-colors cursor-pointer group" onClick={() => setSelectedJob(job)}>
                                                        <td className="px-5 py-4">
                                                            <p className="font-bold text-sm text-foreground truncate max-w-[180px] group-hover:text-tatt-lime transition-colors">{job.title}</p>
                                                            <p className="text-[11px] text-tatt-gray">{job.companyName} · {job.location}</p>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {job.postedBy ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="size-7 rounded-lg bg-tatt-lime/10 flex items-center justify-center text-[10px] font-black text-tatt-lime border border-tatt-lime/20 shrink-0">
                                                                        {initials(`${job.postedBy.firstName} ${job.postedBy.lastName}`)}
                                                                    </div>
                                                                    <p className="text-sm truncate max-w-[120px]">{job.postedBy.firstName} {job.postedBy.lastName}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-tatt-gray italic">Platform Admin</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div 
                                                                onClick={(e) => { e.stopPropagation(); setView("applications"); }}
                                                                className={`size-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all cursor-pointer hover:scale-105 ${
                                                                Number(job.applicationsCount) > 0 
                                                                    ? "bg-tatt-lime text-black border-tatt-lime shadow-sm" 
                                                                    : "bg-background text-tatt-gray border-border"
                                                            }`}>
                                                                {job.applicationsCount || 0}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-xs text-tatt-gray whitespace-nowrap uppercase tracking-widest font-medium">{job.type}</td>
                                                        <td className="px-5 py-4 text-xs text-tatt-gray whitespace-nowrap">{new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${badge.cls}`}>
                                                                <span className="size-1.5 rounded-full bg-current" />{badge.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button title="View Details" onClick={() => setSelectedJob(job)} className="p-1.5 rounded-lg hover:bg-background text-tatt-gray hover:text-tatt-lime"><Eye className="size-4" /></button>
                                                                <button title="Delete Listing" onClick={() => setActionModal({ job, action: "delete" })} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="size-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {(meta?.totalPages ?? 0) > 1 && (
                                    <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-background/30">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Listing Page {page} of {meta?.totalPages}</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                                            <button onClick={() => setPage(p => Math.min(meta?.totalPages ?? 1, p + 1))} disabled={page >= (meta?.totalPages ?? 1)} className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40"><ChevronRight className="size-4" /></button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-border bg-background/50">
                                                {["Applicant", "Target Role", "Submission", ""].map(h => (
                                                    <th key={h} className="px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-tatt-gray whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {loading ? (
                                                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="size-8 animate-spin text-tatt-lime mx-auto" /><p className="text-[9px] font-black uppercase tracking-widest text-tatt-gray mt-4">Accessing application vault...</p></td></tr>
                                            ) : applications.length === 0 ? (
                                                <tr><td colSpan={4} className="py-20 text-center text-tatt-gray text-sm">No applications received yet.</td></tr>
                                            ) : applications.map(app => (
                                                <tr key={app.id} className="hover:bg-background/60 transition-colors group">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {app.applicant?.profilePicture ? (
                                                                <img src={app.applicant.profilePicture} alt="" className="size-8 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className="size-8 rounded-lg bg-tatt-bronze/10 flex items-center justify-center text-[10px] font-black text-tatt-bronze border border-tatt-bronze/20">
                                                                    {initials(`${app.applicant?.firstName} ${app.applicant?.lastName}`)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-sm text-foreground">{app.applicant?.firstName} {app.applicant?.lastName}</p>
                                                                <p className="text-[11px] text-tatt-gray">{app.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="text-xs font-black text-foreground">{app.job?.title}</p>
                                                        <p className="text-[10px] text-tatt-gray uppercase tracking-widest">{app.job?.companyName}</p>
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-tatt-gray">{new Date(app.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button onClick={() => setSelectedApp(app)} className="p-2 rounded-xl bg-background border border-border group-hover:border-tatt-lime group-hover:text-tatt-lime transition-all text-tatt-gray">
                                                            <Eye className="size-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {(appMeta?.totalPages ?? 0) > 1 && (
                                    <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-background/30">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Application Page {page} of {appMeta?.totalPages}</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                                            <button onClick={() => setPage(p => Math.min(appMeta?.totalPages ?? 1, p + 1))} disabled={page >= (appMeta?.totalPages ?? 1)} className="size-9 rounded-lg border border-border flex items-center justify-center hover:bg-surface disabled:opacity-40"><ChevronRight className="size-4" /></button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right panel */}
                    <div className="space-y-4">
                        {/* Trend report */}
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-lime mb-1">Trend Report</p>
                            <h3 className="text-base font-black text-foreground mb-5">Postings by Category</h3>
                            <div className="space-y-4">
                                {(stats?.categories && stats.categories.length > 0) ? (
                                    stats.categories.slice(0, 5).map((cat) => (
                                        <div key={cat.name} className="flex items-center gap-3">
                                            <p className="text-xs font-medium text-foreground w-28 shrink-0 truncate">{cat.name}</p>
                                            <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                                                <div className="h-full bg-tatt-lime rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
                                            </div>
                                            <p className="text-[10px] font-black text-tatt-gray w-8 text-right">{cat.percentage}%</p>
                                        </div>
                                    ))
                                ) : (
                                    CATEGORIES.slice(0, 5).map((cat, i) => {
                                        const pct = Math.max(15, 80 - i * 13);
                                        return (
                                            <div key={cat} className="flex items-center gap-3 blur-[1px] opacity-40 grayscale">
                                                <p className="text-xs font-medium text-foreground w-28 shrink-0 truncate">{cat}</p>
                                                <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                                                    <div className="h-full bg-tatt-lime rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <p className="text-[10px] font-black text-tatt-gray w-8 text-right">{pct}%</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Quick audit */}
                        <div className="bg-tatt-black rounded-2xl p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-lime mb-3">Quick Audit</p>
                                {stats?.flagged ? (
                                    <p className="text-white/80 text-sm leading-relaxed mb-5">
                                        There {stats.flagged === 1 ? "is" : "are"} <span className="text-tatt-lime font-black">{stats.flagged} listing{stats.flagged > 1 ? "s" : ""}</span> flagged requiring review.
                                    </p>
                                ) : (
                                    <p className="text-white/80 text-sm leading-relaxed mb-5">All listings are clean. No items require immediate review.</p>
                                )}
                                <button onClick={() => { setStatusFilter("flagged"); setPage(1); }}
                                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest transition-all">
                                    Review Flagged
                                </button>
                            </div>
                            <AlertTriangle className="absolute right-4 top-4 size-16 text-white/5" />
                        </div>

                        {/* Stats summary */}
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-4">Board Health</p>
                            <div className="space-y-3">
                                {stats && [
                                    { label: "Listings Live", value: stats.active, total: stats.total, color: "bg-tatt-lime" },
                                    { label: "Listings Unlisted", value: stats.inactive, total: stats.total, color: "bg-tatt-gray/40" },
                                    { label: "Listings Flagged", value: stats.flagged, total: stats.total, color: "bg-red-400" },
                                ].map(({ label, value, total, color }) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <p className="text-xs text-tatt-gray w-32 shrink-0">{label}</p>
                                        <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${total > 0 ? Math.round((value / total) * 100) : 0}%` }} />
                                        </div>
                                        <p className="text-[10px] font-black text-foreground w-6 text-right">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {selectedJob && !actionModal && (
                <JobDetailDrawer
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onAction={(action) => { setActionModal({ job: selectedJob, action }); setSelectedJob(null); }}
                />
            )}
            
            {selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/70 backdrop-blur-sm" onClick={() => setSelectedApp(null)}>
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-background/50">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-tatt-lime">Application Detail</p>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mt-1">Submission Review</h3>
                            </div>
                            <button onClick={() => setSelectedApp(null)} className="p-2 rounded-xl hover:bg-background text-tatt-gray transition-colors font-bold flex items-center gap-2 text-[10px] uppercase tracking-widest">
                                Close <X className="size-4" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="flex items-center gap-5">
                                <div className="size-16 rounded-2xl bg-tatt-bronze/10 flex items-center justify-center text-xl font-black text-tatt-bronze border border-tatt-bronze/20 shadow-inner">
                                    {initials(`${selectedApp.applicant?.firstName} ${selectedApp.applicant?.lastName}`)}
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-foreground">{selectedApp.applicant?.firstName} {selectedApp.applicant?.lastName}</h4>
                                    <p className="text-sm text-tatt-gray font-medium">{selectedApp.email} · {selectedApp.phone}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-background border border-border">
                                    <p className="text-[9px] font-black text-tatt-gray uppercase tracking-widest mb-1">Applying For</p>
                                    <p className="text-xs font-bold text-foreground">{selectedApp.job?.title}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-background border border-border">
                                    <p className="text-[9px] font-black text-tatt-gray uppercase tracking-widest mb-1">Company</p>
                                    <p className="text-xs font-bold text-foreground">{selectedApp.job?.companyName}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-tatt-gray uppercase tracking-widest">Cover Letter / Note</p>
                                <p className="text-sm text-foreground/80 leading-relaxed bg-background/50 p-5 rounded-2xl border border-border whitespace-pre-wrap italic">
                                    "{selectedApp.coverLetter || "No cover letter provided."}"
                                </p>
                            </div>

                            {selectedApp.resumeUrl && (
                                <a
                                    href={selectedApp.resumeUrl.startsWith("http") ? selectedApp.resumeUrl : `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api$/, "")}${selectedApp.resumeUrl.startsWith("/") ? "" : "/"}${selectedApp.resumeUrl}`}
                                    target="_blank" rel="noreferrer"
                                    className="block w-full py-4 rounded-2xl bg-foreground text-background font-black uppercase tracking-[0.2em] text-[10px] text-center hover:opacity-90 transition-all shadow-lg"
                                >
                                    View / Download Resume
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {actionModal && (
                <ActionModal
                    job={actionModal.job}
                    action={actionModal.action}
                    onClose={() => setActionModal(null)}
                    onDone={refresh}
                />
            )}
        </div>
    );
}
