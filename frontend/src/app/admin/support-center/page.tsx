"use client";

import { useRouter } from "next/navigation";

import React, { useState, useEffect } from "react";
import {
    Filter,
    Plus,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    MoreHorizontal,
    PlusCircle,
    BarChart2,
    Activity,
    ShieldCheck,
    Calendar,
    TerminalSquare,
    Edit2,
    Loader2
} from "lucide-react";
import api from "@/services/api";

export default function SupportCenterOverview() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const { data } = await api.get('/support/dashboard');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="size-8 animate-spin text-tatt-lime" />
                <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest animate-pulse">Loading Support Hub...</p>
            </div>
        );
    }

    // Default fallback values
    const overview = stats || {
        openTickets: 124,
        avgResponseTime: "1.4h",
        unresolvedUrgent: 8,
        activeTickets: [],
        faqs: []
    };

    const totalFaqs = overview.faqs?.reduce((acc: number, f: any) => acc + parseInt(f.count || 0, 10), 0) || 0;

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-lime mb-1">Central Hub</p>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Support Overview</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/admin/support-center/faqs?create=true')}
                        className="flex items-center gap-2 bg-tatt-lime text-tatt-black px-4 py-2 rounded-xl text-sm font-black hover:brightness-105 transition-all shadow-sm"
                    >
                        <Plus className="size-4" strokeWidth={3} /> New FAQs
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-4">Open Tickets</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black tracking-tighter text-foreground">{overview.openTickets}</span>
                        <span className="text-tatt-error text-xs font-bold flex items-center gap-1"><TrendingUp size={14} /> +12%</span>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-tatt-lime w-[65%]"></div>
                    </div>
                </div>

                <div 
                    onClick={() => router.push('/admin/support-center/faqs')}
                    className="bg-surface p-6 rounded-2xl border border-border shadow-sm cursor-pointer hover:border-tatt-lime/50 transition-all group"
                >
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-4 group-hover:text-tatt-lime transition-colors">Published FAQs</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black tracking-tighter text-foreground group-hover:text-tatt-lime transition-colors">{totalFaqs}</span>
                        <span className="text-tatt-gray text-[10px] uppercase font-bold flex items-center gap-1 tracking-widest">Active Articles</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-tatt-lime transition-opacity">
                        View All FAQs <ArrowRight size={12} />
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm border-l-4 border-l-tatt-error">
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-4">Unresolved Urgent</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black tracking-tighter text-tatt-error">{overview.unresolvedUrgent}</span>
                        <span className="text-tatt-gray text-[10px] uppercase font-bold tracking-widest">Requires Action</span>
                    </div>
                    <div className="mt-4 flex gap-1">
                        {[1, 2, 3].map(i => <div key={i} className="h-2 w-2 rounded-full bg-tatt-error"></div>)}
                        {[1, 2].map(i => <div key={`grey-${i}`} className="h-2 w-2 rounded-full bg-border"></div>)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Active Support Tickets Table */}
                <section className="xl:col-span-8 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
                        <h2 className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Active Support Tickets</h2>
                        <button className="text-[10px] font-bold uppercase tracking-widest text-tatt-lime flex items-center gap-1 hover:underline">
                            View All <ArrowRight size={14} />
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-background/20 border-b border-border">
                                    <th className="px-6 py-4 text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray">Member Name</th>
                                    <th className="px-6 py-4 text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {overview.activeTickets?.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-tatt-gray">No active tickets available.</td>
                                    </tr>
                                ) : overview.activeTickets?.map((ticket: any) => (
                                    <tr 
                                        key={ticket.id} 
                                        onClick={() => router.push(`/admin/support-center/${ticket.id}`)}
                                        className="hover:bg-background/40 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                {ticket.user?.profilePicture ? (
                                                    <img src={ticket.user.profilePicture} className="size-8 rounded-full object-cover border border-border" alt="" />
                                                ) : (
                                                    <div className="size-8 rounded-full bg-tatt-lime/10 flex items-center justify-center font-black text-[10px] text-tatt-lime border border-tatt-lime/20">
                                                        {ticket.user?.initials || '??'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{ticket.user?.firstName} {ticket.user?.lastName}</p>
                                                    <p className="text-[10px] text-tatt-gray uppercase tracking-widest">{ticket.ticketNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm font-bold text-tatt-gray">
                                                <TerminalSquare size={16} className="text-tatt-lime" /> {ticket.category}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="bg-tatt-lime/10 text-tatt-lime px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button className="p-2 hover:bg-tatt-black transition-all hover:text-white rounded-lg text-tatt-gray opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Sidebar Controls */}
                <div className="xl:col-span-4 space-y-8">
                    {/* FAQs Topics Management */}
                    <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                        <h2 className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-6">FAQs Topics</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {overview.faqs && overview.faqs.length > 0 ? (
                                overview.faqs.map((faq: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => router.push(`/admin/support-center/faqs?topic=${faq.category}`)}
                                        className="p-4 border border-border rounded-xl hover:border-tatt-lime/40 transition-all cursor-pointer bg-background group"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <TerminalSquare className="text-tatt-lime size-5" />
                                            <span className="text-sm text-foreground font-black capitalize">
                                                {String(faq.category).toLowerCase().replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-tatt-gray font-medium leading-relaxed mb-4">
                                            Manage standardized responses and guides for this topic.
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold uppercase text-tatt-gray bg-background px-2 py-1 rounded">
                                                {faq.count} FAQs
                                            </span>
                                            <ArrowRight size={14} className="text-tatt-gray group-hover:text-tatt-lime transition-colors" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center border border-border border-dashed rounded-xl bg-background/50">
                                    <ShieldCheck className="size-8 text-border mx-auto mb-3" />
                                    <p className="text-sm text-tatt-gray font-medium mb-4">No topics configured yet.</p>
                                    <button 
                                        onClick={() => router.push('/admin/support-center/faqs')} 
                                        className="text-[10px] bg-tatt-lime/10 px-3 py-2 rounded-lg font-bold uppercase tracking-widest text-tatt-lime hover:bg-tatt-lime/20 transition-colors"
                                    >
                                        Create First Topic
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
