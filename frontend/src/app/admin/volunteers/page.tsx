"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Users, 
    Clock, 
    GraduationCap, 
    Filter, 
    Download, 
    MoreVertical, 
    TrendingUp, 
    TrendingDown,
    PlusCircle,
    BookOpen,
    Search,
    ChevronLeft,
    ChevronRight,
    Star,
    Loader2,
    MapPin,
    Calendar,
    Award,
    Eye,
    CheckCircle2
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/auth-context";

interface VolunteerStat {
    rating: number;
    status: string;
    impactPoints: number;
    totalHours: number;
    grade: string;
}

interface Volunteer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    profilePicture?: string;
    chapter?: {
        name: string;
    };
    volunteerStat?: VolunteerStat;
}

interface Stats {
    totalVolunteers: number;
    pendingApplications: number;
    onboardingVolunteers: number;
    trainingCompletionRate: number;
}

export default function VolunteerCenterPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [totalItems, setTotalItems] = useState(0);
    const [activeTab, setActiveTab] = useState<'registry' | 'activities' | 'roles' | 'applications'>('registry');
    const [applications, setApplications] = useState<any[]>([]);
    const [appsLoading, setAppsLoading] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);
    const [selectedChapter, setSelectedChapter] = useState<string>("all");
    const [activities, setActivities] = useState<any[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [isChapterOpen, setIsChapterOpen] = useState(false);
    
    // Global Modal States
    const [assignActivityVol, setAssignActivityVol] = useState<Volunteer | null>(null);
    const [assignTrainingVol, setAssignTrainingVol] = useState<Volunteer | null>(null);

    const fetchStats = async () => {
        try {
            const { data } = await api.get("/volunteers/admin/stats");
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/list`, {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined,
                    chapterId: selectedChapter !== 'all' ? selectedChapter : undefined
                }
            });
            setVolunteers(data.data);
            setTotalPages(data.totalPages);
            setTotalItems(data.total);
        } catch (error) {
            toast.error("Failed to load volunteers");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async () => {
        try {
            const { data } = await api.get("/chapters");
            const availableChapters = user?.systemRole === 'REGIONAL_ADMIN' 
                ? data.filter((c: any) => c.regionalManagerId === user?.id || c.associateRegionalDirectorId === user?.id)
                : data;
            setChapters(availableChapters);
            if (user?.systemRole === 'REGIONAL_ADMIN' && availableChapters.length > 0 && selectedChapter === 'all') {
                setSelectedChapter(availableChapters[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch chapters", error);
        }
    };

    const fetchAllActivities = async () => {
        setActivitiesLoading(true);
        try {
            if (selectedChapter !== "all") {
                const { data } = await api.get(`/chapters/${selectedChapter}/activities`);
                setActivities(data.data);
            } else {
                const { data } = await api.get(`/chapters/all-activities`);
                setActivities(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch activities", error);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const fetchRoles = async () => {
        setRolesLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/roles`, {
                params: { chapterId: selectedChapter !== 'all' ? selectedChapter : undefined }
            });
            setRoles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch roles", error);
        } finally {
            setRolesLoading(false);
        }
    };

    const fetchApplications = async () => {
        setAppsLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/applications`, {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined,
                    status: 'PENDING'
                }
            });
            setApplications(data.data);
            setTotalPages(data.totalPages);
            setTotalItems(data.total);
        } catch (error) {
            console.error("Failed to fetch applications", error);
            toast.error("Failed to load application queue");
        } finally {
            setAppsLoading(false);
        }
    };

    const handleAppAction = async (id: string, action: 'approve' | 'reject') => {
        const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} candidate...`);
        try {
            const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
            await api.patch(`/volunteers/applications/${id}/status`, { status });
            toast.success(`Candidate ${action}d!`, { id: loadingToast });
            fetchApplications();
            fetchStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Operation failed`, { id: loadingToast });
        }
    };

    useEffect(() => {
        fetchStats();
        fetchChapters();
    }, []);

    useEffect(() => {
        if (activeTab === 'registry') {
            fetchVolunteers();
        } else if (activeTab === 'activities') {
            fetchAllActivities();
        } else if (activeTab === 'roles') {
            fetchRoles();
        } else if (activeTab === 'applications') {
            fetchApplications();
        }
    }, [page, search, activeTab, selectedChapter]);

    const handleExport = () => {
        toast.success("Preparing CSV export for transmission...");
    };

    const renderStars = (rating: number = 5) => {
        return (
            <div className="flex gap-0.5 text-tatt-lime">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-tatt-gray/30"} />
                ))}
            </div>
        );
    };

    return (
        <main className="min-h-screen p-6 md:p-10 lg:p-14 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <h3 className="text-3xl font-black tracking-tight text-foreground italic uppercase">Management Overview</h3>
                    <p className="text-tatt-gray font-medium">Monitor community performance and application pipelines.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => router.push('/admin/volunteers/create')}
                        className="px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground font-bold text-xs uppercase tracking-widest hover:bg-background transition-all flex items-center gap-2 transform active:scale-95"
                    >
                        <PlusCircle size={18} className="text-tatt-lime" />
                        Create Role
                    </button>
                    <button 
                        onClick={() => router.push('/admin/volunteers/training/create')}
                        className="px-5 py-2.5 rounded-xl bg-tatt-lime text-tatt-black font-black text-xs uppercase tracking-widest hover:brightness-105 transition-all flex items-center gap-2 shadow-lg shadow-tatt-lime/20"
                    >
                        <BookOpen size={18} />
                        New Training
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Link href="/admin/volunteers/active" className="block p-8 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4 group hover:border-tatt-lime/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex justify-between items-start">
                        <div className="size-14 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime">
                            <Users size={28} />
                        </div>
                        <span className="text-green-500 text-xs font-black flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                            +12% <TrendingUp size={12} />
                        </span>
                    </div>
                    <div>
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">Total Active Volunteers</p>
                        <h4 className="text-4xl font-black italic tracking-tighter text-foreground">{stats?.totalVolunteers.toLocaleString() || "0"}</h4>
                    </div>
                    <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-tatt-lime transition-all duration-1000" style={{ width: "80%" }}></div>
                    </div>
                </Link>

                <Link href="/admin/volunteers/applications" className="block p-8 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4 group hover:border-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex justify-between items-start">
                        <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Clock size={28} />
                        </div>
                        <span className="text-amber-500 text-xs font-black flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full">
                            NEW APPLICATIONS
                        </span>
                    </div>
                    <div>
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">Pending Applications</p>
                        <h4 className="text-4xl font-black italic tracking-tighter text-foreground">{stats?.pendingApplications.toLocaleString() || "0"}</h4>
                    </div>
                </Link>

                <Link href="/admin/volunteers/onboarding" className="block p-8 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4 group hover:border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex justify-between items-start">
                        <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <GraduationCap size={28} />
                        </div>
                    </div>
                    <div>
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">In-Training Hub</p>
                        <h4 className="text-4xl font-black italic tracking-tighter text-foreground">{stats?.onboardingVolunteers.toLocaleString() || "0"}</h4>
                    </div>
                </Link>

                <Link href="/admin/volunteers/training-stats" className="block p-8 rounded-[2rem] bg-surface border border-border shadow-sm space-y-4 group hover:border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex justify-between items-start">
                        <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <TrendingUp size={28} />
                        </div>
                    </div>
                    <div>
                        <p className="text-tatt-gray text-[10px] font-black uppercase tracking-widest">Global Training Completion</p>
                        <h4 className="text-4xl font-black italic tracking-tighter text-foreground">{stats?.trainingCompletionRate || 0}%</h4>
                    </div>
                    <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats?.trainingCompletionRate || 0}%` }}></div>
                    </div>
                </Link>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border gap-8">
                <button 
                    onClick={() => { setActiveTab('registry'); setSelectedChapter('all'); }}
                    className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'registry' ? 'text-tatt-lime' : 'text-tatt-gray hover:text-foreground'
                    }`}
                >
                    Agent Registry
                    {activeTab === 'registry' && <div className="absolute bottom-0 left-0 w-full h-1 bg-tatt-lime rounded-full shadow-[0_0_10px_rgba(159,204,0,0.5)]"></div>}
                </button>
                <button 
                    onClick={() => { setActiveTab('activities'); setSelectedChapter('all'); }}
                    className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'activities' ? 'text-tatt-lime' : 'text-tatt-gray hover:text-foreground'
                    }`}
                >
                    Chapter Activities
                    {activeTab === 'activities' && <div className="absolute bottom-0 left-0 w-full h-1 bg-tatt-lime rounded-full shadow-[0_0_10px_rgba(159,204,0,0.5)]"></div>}
                </button>
                <button 
                    onClick={() => { setActiveTab('roles'); setSelectedChapter('all'); setPage(1); }}
                    className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'roles' ? 'text-tatt-lime' : 'text-tatt-gray hover:text-foreground'
                    }`}
                >
                    Volunteer Roles
                    {activeTab === 'roles' && <div className="absolute bottom-0 left-0 w-full h-1 bg-tatt-lime rounded-full shadow-[0_0_10px_rgba(159,204,0,0.5)]"></div>}
                </button>
                <button 
                    onClick={() => { setActiveTab('applications'); setSelectedChapter('all'); setPage(1); }}
                    className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'applications' ? 'text-tatt-lime' : 'text-tatt-gray hover:text-foreground'
                    }`}
                >
                    Application Queue
                    {activeTab === 'applications' && <div className="absolute bottom-0 left-0 w-full h-1 bg-tatt-lime rounded-full shadow-[0_0_10px_rgba(159,204,0,0.5)]"></div>}
                </button>
            </div>

            {activeTab === 'registry' ? (
                /* Agent Registry Content */
                <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 animate-in fade-in duration-500">
                    <div className="p-8 border-b border-border flex flex-wrap gap-6 items-center justify-between bg-surface/50 backdrop-blur-sm rounded-t-[2.5rem]">
                        <div className="flex items-center gap-4">
                            <h5 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Active Agent Registry</h5>
                            <div className="px-3 py-1 rounded-full bg-tatt-lime/10 text-tatt-lime text-[10px] font-black border border-tatt-lime/20 tracking-widest uppercase">SECURE DATA</div>
                        </div>
                        <div className="flex flex-1 max-w-md relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4 group-focus-within:text-tatt-lime transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search agents by name..."
                                className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/40"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsChapterOpen(!isChapterOpen)}
                                    className="px-4 py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-background transition-all"
                                >
                                    <Filter size={14} className="text-tatt-lime" />
                                    {selectedChapter === 'all' ? 'All Chapters' : chapters.find(c => c.id === selectedChapter)?.name}
                                </button>
                                {isChapterOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200">
                                        <button 
                                            onClick={() => { setSelectedChapter('all'); setIsChapterOpen(false); }}
                                            className="w-full text-left px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-tatt-lime/10 text-foreground"
                                        >
                                            All Chapters (Global)
                                        </button>
                                        {chapters.map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => { setSelectedChapter(c.id); setIsChapterOpen(false); }}
                                                className="w-full text-left px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-tatt-lime/10 text-foreground"
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-b-[2.5rem]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-background/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Personnel</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Regional Hub</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic text-center">Engagement Rating</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-tatt-lime" size={32} /></td></tr>
                                ) : (
                                    volunteers.map((v) => (
                                        <tr key={v.id} className="border-b border-border/50 hover:bg-background/20 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center text-tatt-lime font-black text-xs shrink-0 overflow-hidden">
                                                        {v.profilePicture ? <img src={v.profilePicture} className="w-full h-full object-cover" alt="" /> : v.firstName[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground font-black text-sm uppercase italic tracking-tight">{v.firstName} {v.lastName}</span>
                                                        <span className="text-tatt-gray text-[10px] font-bold lowercase">{v.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground text-xs font-bold">{v.chapter?.name || "Global Deployment"}</span>
                                                    <span className="text-tatt-gray text-[9px] font-black uppercase tracking-widest">Enlisted {new Date(v.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col items-center gap-1">
                                                    {renderStars(v.volunteerStat?.rating)}
                                                    <span className="text-[9px] font-black text-tatt-gray uppercase tracking-widest">Efficiency Matrix</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right relative">
                                                <details className="dropdown dropdown-end">
                                                    <summary className="p-2 inline-flex justify-center hover:bg-background rounded-lg transition-colors text-tatt-gray hover:text-tatt-lime cursor-pointer list-none [&::-webkit-details-marker]:hidden outline-none">
                                                        <MoreVertical size={18} />
                                                    </summary>
                                                    <ul className="dropdown-content menu p-2 shadow-2xl shadow-black/50 bg-surface border border-border border-t-tatt-lime/50 rounded-xl w-52 z-[100] text-left mt-1">
                                                        <li>
                                                            <a onClick={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.closest("details")?.removeAttribute("open");
                                                                router.push(`/admin/volunteers/${v.id}`);
                                                            }} className="text-xs font-bold text-foreground hover:text-tatt-lime hover:bg-background">
                                                                Edit Volunteer
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a onClick={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.closest("details")?.removeAttribute("open");
                                                                const loadingToast = toast.loading("Dismissing volunteer...");
                                                                api.patch(`/volunteers/admin/profile/${v.id}/stats`, { status: "INACTIVE" })
                                                                    .then(() => {
                                                                        toast.success("Volunteer dismissed from program", { id: loadingToast });
                                                                        fetchVolunteers();
                                                                    })
                                                                    .catch(() => toast.error("Failed to dismiss volunteer", { id: loadingToast }));
                                                            }} className="text-xs font-bold text-red-500 hover:text-red-400 hover:bg-background">
                                                                Dismiss Volunteering
                                                            </a>
                                                        </li>
                                                        <div className="h-px bg-border my-1"></div>
                                                        <li>
                                                            <a onClick={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.closest("details")?.removeAttribute("open");
                                                                setAssignActivityVol(v);
                                                            }} className="text-xs font-bold text-tatt-gray hover:text-tatt-lime hover:bg-background">
                                                                Assign Activity
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a onClick={(e) => {
                                                                e.preventDefault();
                                                                e.currentTarget.closest("details")?.removeAttribute("open");
                                                                setAssignTrainingVol(v);
                                                            }} className="text-xs font-bold text-tatt-gray hover:text-tatt-lime hover:bg-background">
                                                                Assign Training
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </details>
                                            </td>
                                        </tr>

                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'activities' ? (
                /* Chapter Activities Section */
                <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-2xl shadow-sm relative">
                            <Filter size={16} className="text-tatt-lime" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Regional Link:</span>
                            <div className="relative">
                                <button 
                                    onClick={() => setIsChapterOpen(!isChapterOpen)}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground"
                                >
                                    {selectedChapter === 'all' ? 'All Active Hubs' : chapters.find(c => c.id === selectedChapter)?.name}
                                    <ChevronRight size={14} className={`transition-transform duration-300 ${isChapterOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isChapterOpen && (
                                    <div className="absolute top-full left-0 mt-3 w-64 bg-surface border border-border rounded-xl shadow-2xl py-2 z-50">
                                        <button onClick={() => { setSelectedChapter('all'); setIsChapterOpen(false); }} className="w-full text-left px-5 py-3 text-xs font-black uppercase hover:bg-tatt-lime/10">All Hubs</button>
                                        {chapters.map(c => (
                                            <button key={c.id} onClick={() => { setSelectedChapter(c.id); setIsChapterOpen(false); }} className="w-full text-left px-5 py-3 text-xs font-black uppercase hover:bg-tatt-lime/10">{c.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activitiesLoading ? (
                            <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-tatt-lime" size={48} /></div>
                        ) : activities.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-tatt-gray font-bold italic border-2 border-dashed border-border rounded-[3rem]">No active signals from this hub.</div>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="group bg-surface border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-tatt-lime/30 transition-all duration-500 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="px-3 py-1 rounded-full bg-tatt-lime/10 text-tatt-lime text-[9px] font-black tracking-widest uppercase border border-tatt-lime/20">{activity.type}</span>
                                            <span className="text-[10px] font-bold text-tatt-gray flex items-center gap-1.5"><Clock size={12} /> {new Date(activity.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-lg font-black italic tracking-tighter text-foreground mb-3">{activity.title}</h4>
                                        <p className="text-sm text-tatt-gray font-medium line-clamp-3 mb-6">{activity.content}</p>
                                    </div>
                                    <div className="pt-4 border-t border-border/50">
                                        <div className="flex justify-between text-[10px] font-black text-tatt-gray uppercase tracking-widest">
                                            <span>Target Hub</span>
                                            <span className="text-tatt-lime">{activity.chapter?.name || "Global"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : activeTab === 'roles' ? (
                /* Volunteer Roles Section */
                <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 animate-in fade-in duration-500">
                    <div className="p-8 border-b border-border flex flex-wrap gap-6 items-center justify-between bg-surface/50 backdrop-blur-sm rounded-t-[2.5rem]">
                        <div className="flex items-center gap-4">
                            <h5 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Volunteer Role Management</h5>
                            <div className="px-3 py-1 rounded-full bg-tatt-lime/10 text-tatt-lime text-[10px] font-black border border-tatt-lime/20 tracking-widest uppercase">Pipeline</div>
                        </div>
                        <div className="flex items-center gap-3 bg-background border border-border px-4 py-2 rounded-2xl shadow-sm relative">
                            <Filter size={16} className="text-tatt-lime" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Filter Hub:</span>
                            <div className="relative">
                                <button onClick={() => setIsChapterOpen(!isChapterOpen)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground">
                                    {selectedChapter === 'all' ? 'All Roles' : chapters.find(c => c.id === selectedChapter)?.name}
                                    <ChevronRight size={14} className={`transition-transform duration-300 ${isChapterOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isChapterOpen && (
                                    <div className="absolute top-full right-0 mt-3 w-64 bg-surface border border-border rounded-xl shadow-2xl py-2 z-50">
                                        <button onClick={() => { setSelectedChapter('all'); setIsChapterOpen(false); }} className="w-full text-left px-5 py-3 text-xs font-black uppercase hover:bg-tatt-lime/10">All Hub Roles</button>
                                        {chapters.map(c => (
                                            <button key={c.id} onClick={() => { setSelectedChapter(c.id); setIsChapterOpen(false); }} className="w-full text-left px-5 py-3 text-xs font-black uppercase hover:bg-tatt-lime/10">{c.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-b-[2.5rem]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-background/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Role Designation</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Regional Hub</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Applicants</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rolesLoading ? (
                                    <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-tatt-lime" size={32} /></td></tr>
                                ) : roles.length === 0 ? (
                                    <tr><td colSpan={5} className="px-8 py-20 text-center text-tatt-gray font-bold italic">No roles defined for this hub.</td></tr>
                                ) : (
                                    roles.map((r) => (
                                        <tr key={r.id} className="border-b border-border/50 hover:bg-background/20 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-black text-sm uppercase italic tracking-tight">{r.name}</span>
                                                    <span className="text-tatt-gray text-[10px] font-bold">{r.weeklyHours}h/wk Commitment</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-foreground text-xs font-bold">{r.chapter?.name || "Global"}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-1 rounded border text-[9px] font-black tracking-widest uppercase ${r.isActive ? 'text-tatt-lime border-tatt-lime/20 bg-tatt-lime/5' : 'text-tatt-yellow border-tatt-yellow/20 bg-tatt-yellow/5'}`}>
                                                    {r.isActive ? 'Active' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-6 rounded-full bg-tatt-lime/10 text-tatt-lime flex items-center justify-center text-[10px] font-black">{r.applicationsCount || 0}</span>
                                                    <span className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">Candidates</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                                <button 
                                                    onClick={() => router.push(`/dashboard/volunteers/${r.id}`)}
                                                    className="p-2.5 rounded-xl border border-border text-tatt-gray hover:text-tatt-lime hover:border-tatt-lime transition-all transform active:scale-95 shadow-sm bg-surface"
                                                    title="View Public Page"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => router.push(`/admin/volunteers/roles/${r.id}/applicants`)}
                                                    className="px-4 py-2 bg-foreground text-surface text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-tatt-lime hover:text-tatt-black transition-all transform active:scale-95 shadow-sm"
                                                >
                                                    View Pipeline
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Application Queue Section */
                <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 animate-in fade-in duration-500">
                    <div className="p-8 border-b border-border flex flex-wrap gap-6 items-center justify-between bg-surface/50 backdrop-blur-sm rounded-t-[2.5rem]">
                        <div className="flex items-center gap-4">
                            <h5 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Recruitment Pipeline</h5>
                            <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20 tracking-widest uppercase">Awaiting Action</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-b-[2.5rem]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-background/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Candidate</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Target Role</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Applied On</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-tatt-gray italic text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appsLoading ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-tatt-lime" size={32} /></td></tr>
                                ) : applications.length === 0 ? (
                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-tatt-gray font-bold italic uppercase tracking-widest">No pending applications at this time.</td></tr>
                                ) : (
                                    applications.map((app) => (
                                        <tr key={app.id} className="border-b border-border/50 hover:bg-background/20 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground font-black text-sm uppercase italic tracking-tight">{app.user.firstName} {app.user.lastName}</span>
                                                    <span className="text-tatt-gray text-[10px] font-bold lowercase">{app.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-foreground text-xs font-bold uppercase">{app.role?.name || "General Deployment"}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-tatt-gray text-xs font-bold">{new Date(app.createdAt).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                                <button 
                                                    onClick={() => handleAppAction(app.id, 'reject')}
                                                    className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleAppAction(app.id, 'approve')}
                                                    className="px-3 py-1.5 rounded-lg bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-widest hover:brightness-105 transition-all shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Global Modals */}
            {/* Global Modals */}
            {assignActivityVol && (
                <dialog open className="modal modal-open">
                    <div className="modal-box bg-surface border border-border/50 text-left relative z-50">
                        <h3 className="font-black italic text-lg uppercase mb-4 text-foreground">Assign Activity</h3>
                        <p className="text-xs text-tatt-gray font-bold mb-6">
                            Select available activities to assign to {assignActivityVol.firstName} {assignActivityVol.lastName}.
                        </p>
                        <div className="space-y-3 mb-8">
                            {['Community Outreach coordination', 'Event Setup Assistance', 'Local Mentorship Meeting'].map((act, i) => (
                                <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-tatt-lime/50 transition-colors">
                                    <input type="checkbox" className="checkbox checkbox-sm checkbox-success rounded" />
                                    <span className="text-xs font-black text-foreground">{act}</span>
                                </label>
                            ))}
                        </div>
                        <div className="modal-action">
                            <button onClick={() => setAssignActivityVol(null)} className="px-4 py-2 font-black uppercase text-xs tracking-widest text-tatt-gray hover:text-foreground">Cancel</button>
                            <button 
                                onClick={() => {
                                    toast.success("Activity successfully assigned!");
                                    setAssignActivityVol(null);
                                }}
                                className="px-5 py-2 font-black uppercase text-xs tracking-widest bg-tatt-lime text-tatt-black rounded-lg hover:brightness-110"
                            >
                                Assign Selection
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setAssignActivityVol(null)}>
                        <button className="hidden">close</button>
                    </div>
                </dialog>
            )}

            {assignTrainingVol && (
                <dialog open className="modal modal-open">
                    <div className="modal-box bg-surface border border-border/50 text-left relative z-50">
                        <h3 className="font-black italic text-lg uppercase mb-4 text-foreground">Assign Training</h3>
                        <p className="text-xs text-tatt-gray font-bold mb-6">
                            Select mandatory trainings to assign to {assignTrainingVol.firstName} {assignTrainingVol.lastName}.
                        </p>
                        <div className="space-y-3 mb-8">
                            {['Leadership Readiness 101', 'Conflict Resolution Seminar', 'Community Building Basics'].map((train, i) => (
                                <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-blue-500/50 transition-colors">
                                    <input type="checkbox" className="checkbox checkbox-sm checkbox-info rounded" />
                                    <span className="text-xs font-black text-foreground">{train}</span>
                                </label>
                            ))}
                        </div>
                        <div className="modal-action">
                            <button onClick={() => setAssignTrainingVol(null)} className="px-4 py-2 font-black uppercase text-xs tracking-widest text-tatt-gray hover:text-foreground">Cancel</button>
                            <button 
                                onClick={() => {
                                    toast.success("Training assigned successfully!");
                                    setAssignTrainingVol(null);
                                }}
                                className="px-5 py-2 font-black uppercase text-xs tracking-widest bg-blue-500 text-white rounded-lg hover:brightness-110"
                            >
                                Assign Selection
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setAssignTrainingVol(null)}>
                        <button className="hidden">close</button>
                    </div>
                </dialog>
            )}

        </main>
    );
}
