"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    IdCard,
    DollarSign,
    Heart,
    UserPlus,
    Flag,
    FileUp,
    Star,
    Eye,
    Check,
    TrendingUp,
    Activity,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { useAdminDashboardOverview } from "@/hooks/use-queries";

export default function AdminDashboardOverview() {
    const router = useRouter();
    const { data, isLoading, isError, error, refetch } = useAdminDashboardOverview();

    if (isLoading) {
        return (
            <div className="flex h-96 w-full flex-col items-center justify-center space-y-4">
                <RefreshCw className="size-10 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-bold text-sm uppercase tracking-widest animate-pulse">Loading Dashboard Statistics...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-96 w-full flex-col items-center justify-center space-y-4 text-center px-6">
                <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
                    <AlertCircle className="size-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-foreground">Dashboard Load Failed</h3>
                <p className="text-tatt-gray max-w-sm">{(error as Error)?.message || 'An unexpected error occurred.'}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-tatt-lime text-tatt-black font-bold rounded-xl uppercase tracking-widest text-xs hover:brightness-105 transition-all"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    if (!data) return null;

    const { kpis: backendKpis, communityGrowth, subscriberBreakdown, activities, moderationItems } = data;

    const kpis = [
        {
            label: "Total Members",
            value: backendKpis.totalMembers.value,
            trend: backendKpis.totalMembers.trend,
            trendType: backendKpis.totalMembers.trendType,
            icon: <Users size={20} />,
            subtitle: "Pan-African Network",
            color: "text-tatt-lime bg-tatt-lime/10"
        },
        {
            label: "Active Subscriptions",
            value: backendKpis.activeSubscriptions.value,
            trend: backendKpis.activeSubscriptions.trend,
            trendType: backendKpis.activeSubscriptions.trendType,
            icon: <IdCard size={20} />,
            subtitle: "Paid Tiers",
            color: "text-blue-500 bg-blue-500/10"
        },
        {
            label: "Monthly Revenue",
            value: backendKpis.monthlyRevenue.value,
            trend: backendKpis.monthlyRevenue.trend,
            trendType: backendKpis.monthlyRevenue.trendType,
            icon: <DollarSign size={20} />,
            subtitle: "USD Equivalent",
            color: "text-tatt-lime bg-tatt-lime/10",
            href: "/admin/revenue"
        },
        {
            label: "Volunteer Count",
            value: backendKpis.volunteerCount.value,
            trend: backendKpis.volunteerCount.trend,
            trendType: backendKpis.volunteerCount.trendType,
            icon: <Heart size={20} />,
            subtitle: "Verified Activists",
            color: "text-foreground bg-foreground/5"
        }
    ];

    const getIconForActivity = (type: string) => {
        switch (type) {
            case 'NEW_MEMBER': return <UserPlus size={18} className="text-green-600" />;
            case 'NEW_POST': return <FileUp size={18} className="text-blue-600" />;
            case 'MODERATION_FLAG': return <Flag size={18} className="text-red-600" />;
            default: return <Star size={18} className="text-tatt-black" />;
        }
    };

    const getBgForActivity = (type: string) => {
        switch (type) {
            case 'NEW_MEMBER': return 'bg-green-50';
            case 'NEW_POST': return 'bg-blue-50';
            case 'MODERATION_FLAG': return 'bg-red-50';
            default: return 'bg-tatt-lime/10';
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Dashboard Overview</h2>
                <p className="text-tatt-gray text-sm font-medium">Welcome back to the TATT Control Center.</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => kpi.href && router.push(kpi.href)}
                        className={`bg-surface p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow ${kpi.href ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-xl ${kpi.color}`}>
                                {kpi.icon}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${kpi.trendType === 'up' ? 'text-green-600 bg-green-50' : 'text-tatt-gray bg-background'
                                }`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <h3 className="text-tatt-gray text-xs font-bold uppercase tracking-widest">{kpi.label}</h3>
                        <p className="text-2xl font-black text-foreground mt-1 tracking-tight">{kpi.value}</p>
                        <p className="text-[10px] text-tatt-gray font-bold mt-2 uppercase tracking-[0.2em]">{kpi.subtitle}</p>
                        {kpi.label === "Monthly Revenue" && (
                            <div className="absolute top-4 right-4 group/info">
                                <AlertCircle size={14} className="text-tatt-gray/30 hover:text-tatt-lime transition-colors cursor-help" />
                                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-tatt-black text-white text-[10px] rounded-xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all z-50 shadow-2xl font-medium leading-relaxed border border-white/10">
                                    Historical Comparison: This metric reflects a rolling 30-day window. Figures in Revenue Center represent calendar months.
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Community Growth */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="text-tatt-lime size-5" /> Community Growth
                            </h3>
                            <p className="text-sm text-tatt-gray font-medium">Monthly member acquisition rate</p>
                        </div>
                        <select className="bg-background border border-border rounded-xl text-xs font-bold text-tatt-gray px-3 py-2 focus:ring-2 focus:ring-tatt-lime outline-none cursor-pointer">
                            <option>Last 6 Months</option>
                        </select>
                    </div>

                    <div className="relative h-[240px] w-full mt-4">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--tatt-lime)" stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="var(--tatt-lime)" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0,35 Q10,32 20,25 T40,15 T60,20 T80,10 T100,5 L100,40 L0,40 Z" fill="url(#chartGradient)"></path>
                            <path d="M0,35 Q10,32 20,25 T40,15 T60,20 T80,10 T100,5" fill="none" stroke="var(--tatt-lime)" strokeLinecap="round" strokeWidth="0.8"></path>
                        </svg>
                        <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] font-bold text-tatt-gray/50 pt-3 border-t border-border">
                            {communityGrowth.labels.map((m: string) => <span key={m}>{m}</span>)}
                        </div>
                    </div>
                </div>

                {/* Subscriber Breakdown */}
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-foreground">Subscriber Tiers</h3>
                    <p className="text-sm text-tatt-gray font-medium mb-8">Distribution across levels</p>

                    <div className="flex justify-center mb-8">
                        <div className="relative size-44 rounded-full border-[18px] border-background flex items-center justify-center">
                            <div className="absolute inset-[-18px] rounded-full border-[18px] border-tatt-lime" style={{ clipPath: "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 60%)" }}></div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-foreground">100%</p>
                                <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest">Growth</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            { label: "Sankofa", value: subscriberBreakdown.freeTier, color: "bg-tatt-gray/20 border border-border/10" },
                            { label: "Ubuntu", value: subscriberBreakdown.ubuntuTier, color: "bg-tatt-lime/10" },
                            { label: "Imani", value: subscriberBreakdown.imaniTier, color: "bg-tatt-lime/40" },
                            { label: "Kiongozi", value: subscriberBreakdown.kiongoziTier, color: "bg-tatt-lime shadow-sm shadow-tatt-lime/20" }
                        ].map((tier, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`size-3 rounded-full ${tier.color}`}></div>
                                    <span className="text-sm font-medium text-tatt-gray">{tier.label}</span>
                                </div>
                                <span className="text-sm font-black text-foreground">{tier.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activity & Moderation */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Activity Feed */}
                <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Activity className="size-5 text-tatt-lime" /> Platform Activity
                        </h3>
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                router.push('/admin/membership-center');
                            }}
                            className="bg-tatt-lime/10 text-tatt-lime px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-tatt-lime hover:text-tatt-black transition-all active:scale-95"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-border">
                        {activities.length === 0 ? (
                            <div className="p-8 text-center text-sm font-medium text-tatt-gray">No new activity detected.</div>
                        ) : activities.map((act: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => router.push(act.type === 'MODERATION_FLAG' ? '/admin/feed-moderation' : '/admin/membership-center')}
                                className="p-4 border-b border-border flex items-center gap-4 hover:bg-background/80 transition-all cursor-pointer group"
                            >
                                <div className={`size-10 rounded-xl ${getBgForActivity(act.type)} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                    {getIconForActivity(act.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{act.title}</p>
                                    <p className="text-[11px] text-tatt-gray font-medium">{act.desc}</p>
                                </div>
                                <span className="text-[10px] font-bold text-tatt-gray/40 shrink-0 uppercase tracking-tighter">
                                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Moderation List */}
                <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-foreground">Pending Moderation</h3>
                            {moderationItems.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                                    {moderationItems.length} Active
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        {moderationItems.length === 0 ? (
                            <div className="p-8 text-center text-sm font-medium text-tatt-gray">No items pending moderation.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-background/50 text-[10px] uppercase font-bold text-tatt-gray tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Issue</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {moderationItems.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-background/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {item.user.profilePicture ? (
                                                        <img src={item.user.profilePicture} className="size-8 rounded-full object-cover border border-border" alt="" />
                                                    ) : (
                                                        <div className="size-8 rounded-full bg-tatt-lime/10 flex items-center justify-center font-black text-[10px] text-tatt-lime border border-tatt-lime/20">
                                                            {item.user.initials}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-foreground truncate">{item.user.name}</p>
                                                        <p className="text-[10px] text-tatt-gray font-medium uppercase tracking-tighter">{item.user.tier}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-foreground">{item.issue}</span>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-tatt-gray/60 uppercase">
                                                {new Date(item.time).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="size-8 rounded-lg border border-border flex items-center justify-center text-tatt-gray hover:bg-tatt-black hover:text-white   transition-all shadow-sm">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button className="size-8 rounded-lg bg-tatt-lime text-tatt-black flex items-center justify-center hover:brightness-110 transition-all shadow-sm shadow-tatt-lime/20">
                                                        <Check size={14} className="stroke-[3px]" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
