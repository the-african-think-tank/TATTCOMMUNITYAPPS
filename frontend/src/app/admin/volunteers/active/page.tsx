"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Users, 
    ArrowLeft,
    Filter, 
    Download, 
    MoreVertical, 
    Search,
    ChevronLeft,
    ChevronRight,
    Star,
    Loader2
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { ActionDropdown } from "@/components/ui/action-dropdown";

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
    chapter?: {
        name: string;
    };
    volunteerStat?: VolunteerStat;
}

export default function ActiveVolunteersPage() {
    const router = useRouter();
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [totalItems, setTotalItems] = useState(0);

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/volunteers/admin/list`, {
                params: {
                    page,
                    limit: 10,
                    search: search || undefined,
                    status: 'ACTIVE'
                }
            });
            setVolunteers(data.data);
            setTotalPages(data.totalPages);
            setTotalItems(data.total);
        } catch (error) {
            toast.error("Failed to load active volunteers");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVolunteers();
    }, [page, search]);

    const renderStars = (rating: number = 5) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        return (
            <div className="flex text-tatt-lime">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={14} 
                        className={i < fullStars ? "fill-current" : i === fullStars && hasHalfStar ? "" : "opacity-30"} 
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <Link href="/admin/volunteers" className="text-tatt-lime flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline mb-2">
                        <ArrowLeft size={14} /> Back to Center
                    </Link>
                    <h3 className="text-3xl font-black tracking-tight text-foreground italic uppercase">Active Volunteer Registry</h3>
                    <p className="text-tatt-gray font-medium">Detailed performance metrics for currently deployed community agents.</p>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                <div className="p-8 border-b border-border flex flex-wrap gap-6 items-center justify-between bg-surface/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime">
                            <Users size={24} />
                        </div>
                        <div>
                            <h5 className="text-xl font-black uppercase italic tracking-tighter">Active Node Strength</h5>
                            <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">{totalItems} Verified Agents Deployed</p>
                        </div>
                    </div>
                    <div className="flex flex-1 max-w-md relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4 group-focus-within:text-tatt-lime transition-colors" />
                        <input 
                            type="text"
                            placeholder="Filter active agents..."
                            className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/40"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-background/20 text-tatt-gray text-[10px] font-black uppercase tracking-[0.2em] border-b border-border">
                                <th className="px-8 py-6">Agent Identity</th>
                                <th className="px-8 py-6">Deployment Chapter</th>
                                <th className="px-8 py-6">Performance Rating</th>
                                <th className="px-8 py-6">Impact Score</th>
                                <th className="px-8 py-6">Engagement</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <Loader2 className="animate-spin text-tatt-lime mx-auto mb-4" size={40} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Syncing Agent Data...</p>
                                    </td>
                                </tr>
                            ) : volunteers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <p className="text-tatt-gray font-bold italic uppercase tracking-widest">No active agents matching your query</p>
                                    </td>
                                </tr>
                            ) : (
                                volunteers.map((agent) => (
                                    <tr 
                                        key={agent.id} 
                                        onClick={() => router.push(`/admin/volunteers/${agent.id}`)}
                                        className="hover:bg-tatt-lime/[0.02] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-11 rounded-2xl bg-tatt-lime/10 text-tatt-lime flex items-center justify-center font-black text-xs border border-tatt-lime/20">
                                                    {agent.firstName.charAt(0)}{agent.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-foreground uppercase tracking-tight group-hover:text-tatt-lime">
                                                        {agent.firstName} {agent.lastName}
                                                    </p>
                                                    <p className="text-[9px] text-tatt-gray font-bold uppercase tracking-widest italic mt-0.5">
                                                        Active since {new Date(agent.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-foreground bg-background px-3 py-1.5 rounded-lg border border-border">
                                                {agent.chapter?.name || "Global"}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {renderStars(agent.volunteerStat?.rating)}
                                        </td>
                                        <td className="px-8 py-6 font-black text-foreground">
                                            {agent.volunteerStat?.impactPoints || 0}
                                        </td>
                                        <td className="px-8 py-6 text-[11px] font-bold text-tatt-gray uppercase tracking-widest">
                                            {agent.volunteerStat?.totalHours || 0} Hours Contributed
                                        </td>
                                         <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                             <ActionDropdown
                                                 ariaLabel="Volunteer Options"
                                                 items={[
                                                     {
                                                         key: "view",
                                                         label: "View Full Profile",
                                                         onPress: () => router.push(`/admin/volunteers/${agent.id}`)
                                                     },
                                                     {
                                                         key: "dismiss",
                                                         label: "Dismiss Volunteer",
                                                         isDanger: true,
                                                         onPress: () => {
                                                             const loadingToast = toast.loading("Dismissing volunteer...");
                                                             api.patch(`/volunteers/admin/profile/${agent.id}/stats`, { status: "INACTIVE" })
                                                                 .then(() => {
                                                                     toast.success("Volunteer dismissed", { id: loadingToast });
                                                                     fetchVolunteers();
                                                                 })
                                                                 .catch(() => toast.error("Failed to dismiss volunteer", { id: loadingToast }));
                                                         }
                                                     }
                                                 ]}
                                             />
                                         </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-8 border-t border-border flex items-center justify-between bg-surface/30">
                    <p className="text-[10px] font-black text-tatt-gray uppercase tracking-widest">
                        Showing {volunteers.length} of {totalItems} Active Agents
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="size-10 rounded-xl border border-border flex items-center justify-center hover:bg-background transition-all disabled:opacity-30 group"
                        >
                            <ChevronLeft size={18} className="text-tatt-gray group-hover:text-tatt-lime" />
                        </button>
                        <div className="px-4 text-xs font-black uppercase tracking-widest text-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <button 
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="size-10 rounded-xl border border-border flex items-center justify-center hover:bg-background transition-all disabled:opacity-30 group"
                        >
                            <ChevronRight size={18} className="text-tatt-gray group-hover:text-tatt-lime" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
