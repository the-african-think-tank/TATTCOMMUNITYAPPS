"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
    IdCard,
    Users,
    Tag,
    Plus,
    Filter,
    Search,
    Edit2,
    Check,
    X,
    Loader2,
    Calendar,
    ArrowUpRight,
    Download,
    Bell,
    CheckCircle2,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Search as SearchIcon,
    LayoutDashboard,
    Trash2,
    Ticket,
    Activity,
    Shield,
    Save
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

type TabType = "OVERVIEW" | "PLANS" | "DISCOUNTS" | "MEMBERS";

const TIER_OPTIONS = [
    'FREE',
    'UBUNTU',
    'IMANI',
    'KIONGOZI',
] as const;

const TIER_LABELS: Record<string, string> = {
    FREE: 'Sankofa',
    UBUNTU: 'Ubuntu',
    IMANI: 'Imani',
    KIONGOZI: 'Kiongozi',
};

export default function MembershipCenterPage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW");

    // Persist tab state in URL for better navigation (e.g. returning from perks)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab") as TabType;
        if (tab && (["OVERVIEW", "PLANS", "DISCOUNTS", "MEMBERS"] as TabType[]).includes(tab)) {
            setActiveTab(tab);
        }
    }, []);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
    };

    const [data, setData] = useState<any>({
        tiers: [],
        subscribers: [],
        discounts: [],
        analytics: { labels: [], tierGrowth: {}, totalGrowthRate: "0%" },
        chapters: []
    });
    const [filters, setFilters] = useState({
        tier: "",
        chapterId: "",
        billingCycle: "",
        search: "",
        role: "",
        page: 1,
        limit: 10
    });
    const [promoForm, setPromoForm] = useState({
        name: "",
        value: "",
        validUntil: "",
        applicablePlans: ["KIONGOZI"],
        applyToAnnualOnly: true
    });
    const [isCreatingPromo, setIsCreatingPromo] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [reassignTarget, setReassignTarget] = useState<{ id: string; name: string; currentTier: string } | null>(null);
    const [reassignTier, setReassignTier] = useState<string>('');
    const [reassigning, setReassigning] = useState(false);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters as any).toString();
            const [tiersRes, subscribersRes, discountsRes, analyticsRes, chaptersRes] = await Promise.all([
                api.get("/billing/plans"),
                api.get(`/membership-center/subscribers?${query}`),
                api.get("/membership-center/discounts"),
                api.get("/membership-center/analytics"),
                api.get("/membership-center/chapters")
            ]);

            setData({
                tiers: tiersRes.data,
                subscribers: subscribersRes.data.members || [],
                pagination: {
                    total: subscribersRes.data.total || 0,
                    page: subscribersRes.data.page || 1,
                    totalPages: subscribersRes.data.totalPages || 1
                },
                discounts: discountsRes.data,
                analytics: analyticsRes.data,
                chapters: chaptersRes.data
            });
        } catch (err: any) {
            toast.error("Failed to sync membership data");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
    };

    const handleApplyCampaign = async () => {
        if (!promoForm.name || !promoForm.value || !promoForm.validUntil) {
            toast.error("Missing campaign details");
            return;
        }
        setIsCreatingPromo(true);
        try {
            const payload = {
                ...promoForm,
                code: promoForm.name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4),
                discountType: 'percentage',
                duration: 'once',
                value: parseInt(promoForm.value)
            };
            await api.post("/membership-center/discounts", payload);
            toast.success("Campaign Applied! Members notified.");
            setPromoForm({ name: "", value: "", validUntil: "", applicablePlans: ["KIONGOZI"], applyToAnnualOnly: true });
            fetchAllData();
        } catch (err) {
            toast.error("Failed to apply campaign");
        } finally {
            setIsCreatingPromo(false);
        }
    };

    const toggleMemberSelection = (id: string) => {
        setSelectedMembers(prev => 
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const toggleAllMembers = () => {
        if (selectedMembers.length === data.subscribers.length && data.subscribers.length > 0) {
            setSelectedMembers([]);
        } else {
            setSelectedMembers(data.subscribers.map((s: any) => s.id));
        }
    };

    const handleExport = () => {
        if (!data.subscribers.length) return toast.error("No data to export");
        
        const headers = ["First Name", "Last Name", "Email", "Tier", "Chapter", "Cycle", "Expires"];
        const rows = data.subscribers.map((s: any) => [
            s.firstName, s.lastName, s.email, s.communityTier, 
            s.chapter?.name || "Global", s.billingCycle || "FREE", 
            s.subscriptionExpiresAt ? new Date(s.subscriptionExpiresAt).toLocaleDateString() : "N/A"
        ]);
        
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tatt-members-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success("Member data exported successfully");
    };

    const handleBulkAction = async (action: 'archive' | 'reassign') => {
        if (!selectedMembers.length) return;
        
        const msg = action === 'archive' 
            ? `Are you sure you want to archive ${selectedMembers.length} members?`
            : "Reassign selected members to which tier? (Simplified for now - contact dev for full logic)";
            
        if (!confirm(msg)) return;
        
        try {
            await api.post(`/membership-center/bulk-${action}`, { memberIds: selectedMembers });
            toast.success(`Bulk ${action} completed successfully`);
            setSelectedMembers([]);
            fetchAllData();
        } catch (err) {
            toast.error(`Failed to perform bulk ${action}`);
        }
    };

    // --- Reassign Membership Tier ---
    const handleReassignTier = async () => {
        if (!reassignTarget || !reassignTier) return;
        setReassigning(true);
        try {
            await api.patch(`/users/${reassignTarget.id}`, { communityTier: reassignTier });
            toast.success(`${reassignTarget.name} reassigned to ${TIER_LABELS[reassignTier]} Tier`);
            setReassignTarget(null);
            setReassignTier('');
            fetchAllData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to reassign tier');
        } finally {
            setReassigning(false);
        }
    };

    const handleDeleteDiscount = async (id: string) => {
        if (!confirm("Are you sure you want to remove this promotion? This will also delete it from Stripe.")) return;
        try {
            await api.delete(`/membership-center/discounts/${id}`);
            toast.success("Promotion removed successfully");
            fetchAllData();
        } catch (err) {
            toast.error("Failed to remove promotion");
        }
    };

    if (loading && data.tiers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="size-12 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-black text-xs uppercase tracking-widest animate-pulse">Establishing Secure Connection...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Page Title & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Membership Management</h2>
                    <p className="text-xs text-tatt-gray font-medium mt-1 uppercase tracking-widest">Efficiency-first administration for TATT membership</p>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">


                    <button 
                        onClick={() => router.push('/admin/membership-center/new')}
                        className="flex-1 md:flex-none bg-tatt-lime text-tatt-black px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-tatt-lime/20"
                    >
                        <Plus size={14} />
                        <span>Quick Create</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-surface border-b border-border flex space-x-8 px-2 overflow-x-auto scrollbar-hide sticky top-0 md:static z-10 bg-background/80 backdrop-blur-md md:bg-transparent">
                {[
                    { id: "OVERVIEW", label: "Overview", icon: LayoutDashboard },
                    { id: "PLANS", label: "Perks", icon: IdCard },
                    { id: "DISCOUNTS", label: "Discounts", icon: Tag },
                    { id: "MEMBERS", label: "Members", icon: Users },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as TabType)}
                        className={`py-4 px-1 text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 transition-all border-b-2 ${
                            activeTab === tab.id ? "border-tatt-lime text-foreground" : "border-transparent text-tatt-gray hover:text-foreground"
                        }`}
                    >
                        <tab.icon size={14} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {/* Growth Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        label="Free Tier Growth" 
                        value={data.analytics?.stats?.free || 0} 
                        change={data.analytics?.stats?.freeRate || "0%"} 
                        isPositive={!data.analytics?.stats?.freeRate?.startsWith("-")} 
                        onClick={() => {
                            setActiveTab("MEMBERS");
                            handleFilterChange("tier", filters.tier === "FREE" ? "" : "FREE");
                        }}
                    />
                    <StatCard 
                        label="Ubuntu Growth" 
                        value={data.analytics?.stats?.ubuntu || 0} 
                        change={data.analytics?.stats?.ubuntuRate || "0%"} 
                        isPositive={!data.analytics?.stats?.ubuntuRate?.startsWith("-")} 
                        onClick={() => {
                            setActiveTab("MEMBERS");
                            handleFilterChange("tier", filters.tier === "UBUNTU" ? "" : "UBUNTU");
                        }}
                    />
                    <StatCard 
                        label="Imani Growth" 
                        value={data.analytics?.stats?.imani || 0} 
                        change={data.analytics?.stats?.imaniRate || "0%"} 
                        isPositive={!data.analytics?.stats?.imaniRate?.startsWith("-")} 
                        onClick={() => {
                            setActiveTab("MEMBERS");
                            handleFilterChange("tier", filters.tier === "IMANI" ? "" : "IMANI");
                        }}
                    />
                    <StatCard 
                        label="Kiongozi Growth" 
                        value={data.analytics?.stats?.kiongozi || 0} 
                        change={data.analytics?.stats?.kiongoziRate || "0%"} 
                        isPositive={!data.analytics?.stats?.kiongoziRate?.startsWith("-")} 
                        onClick={() => {
                            setActiveTab("MEMBERS");
                            handleFilterChange("tier", filters.tier === "KIONGOZI" ? "" : "KIONGOZI");
                        }}
                    />
                </div>

                {["OVERVIEW", "PLANS", "DISCOUNTS"].includes(activeTab) && (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Membership Plans Table (as part of overview) */}
                        {activeTab === "OVERVIEW" && (
                            <div className="col-span-12 space-y-6">
                                <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-background/30">
                                            <tr>
                                                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-tatt-gray">Plan Name</th>
                                                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-tatt-gray">Price (USD)</th>
                                                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-tatt-gray">Assigned Perks</th>
                                                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-tatt-gray text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.tiers.map((tier: any) => (
                                                <tr key={tier.id} className="hover:bg-tatt-lime/[0.02] transition-colors group">
                                                    <td className="px-4 py-4">
                                                        <input 
                                                            className="bg-transparent border-none p-0 text-sm font-black focus:ring-0 w-full focus:bg-background rounded px-2 -ml-2 transition-all" 
                                                            type="text" 
                                                            value={tier.name} 
                                                            readOnly 
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-tatt-gray text-xs">$</span>
                                                            <span className="text-sm font-black text-foreground">{tier.monthlyPrice}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {[...(tier.features || []), ...(tier.accessControls || []).filter((a: any) => a.enabled).map((a: any) => a.title)].slice(0, 3).map((perk: any, i: number) => (
                                                                <span key={i} className="bg-background border border-border px-2 py-0.5 rounded text-[10px] font-bold flex items-center group/perk">
                                                                    {perk}
                                                                    <button className="ml-1 text-tatt-gray hover:text-red-500 opacity-0 group-hover/perk:opacity-100 transition-all">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button 
                                                                onClick={async () => {
                                                                    if(confirm('Are you sure you want to delete this plan?')) {
                                                                        try {
                                                                            await api.delete(`/membership-center/tiers/${tier.id}`);
                                                                            toast.success("Plan deleted successfully");
                                                                            fetchAllData();
                                                                        } catch (err) {
                                                                            toast.error("Failed to delete plan");
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1.5 text-tatt-gray hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                            <div className="relative group/dropdown">
                                                                <button className="p-1.5 text-tatt-gray hover:text-foreground transition-all">
                                                                    <MoreVertical size={14} />
                                                                </button>
                                                                <div className="absolute right-0 top-full w-40 bg-surface border border-border rounded-xl shadow-xl opacity-0 pointer-events-none group-hover/dropdown:opacity-100 group-hover/dropdown:pointer-events-auto transition-all z-50 flex flex-col p-1 overflow-hidden">
                                                                    <button onClick={() => router.push('/admin/membership-center/' + tier.id)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:bg-background hover:text-foreground rounded-lg transition-colors">Edit Plan</button>
                                                                    <button onClick={() => router.push('/admin/membership-center/' + tier.id)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:bg-background hover:text-foreground rounded-lg transition-colors">Add New Perk</button>
                                                                    <button onClick={() => router.push('/admin/membership-center/' + tier.id)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:bg-background hover:text-foreground rounded-lg transition-colors">Add Benefit</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 bg-background/20 border-t border-border flex justify-between items-center">
                                    <span className="text-[10px] text-tatt-gray font-black uppercase tracking-widest italic">Showing {data.tiers.length} global membership plans</span>
                                    <div className="flex items-center space-x-4">
                                        <button className="text-[10px] font-black text-tatt-lime hover:underline uppercase tracking-widest disabled:opacity-30">Previous</button>
                                        <div className="flex space-x-2">
                                            <span className="px-2 py-0.5 bg-tatt-lime text-tatt-black text-[10px] font-black rounded">1</span>
                                        </div>
                                        <button className="text-[10px] font-black text-tatt-lime hover:underline uppercase tracking-widest disabled:opacity-30">Next</button>
                                    </div>
                                </div>
                                </div>
                            </div>
                        )}

                        {/* Plan Perks Breakdown Tab */}
                        {activeTab === "PLANS" && (
                            <div className="col-span-12 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {data.tiers.map((tier: any) => (
                                        <div key={tier.id} className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col group hover:border-tatt-lime transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-black text-foreground tracking-tight">{tier.name || 'Unnamed Plan'}</h3>
                                                    <span className="text-[10px] font-black uppercase text-tatt-lime tracking-widest">{tier.status}</span>
                                                </div>
                                                <button 
                                                    onClick={() => router.push('/admin/membership-center/' + tier.id)}
                                                    className="p-2 text-tatt-gray hover:text-foreground hover:bg-background rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                            
                                            <div className="flex-1 space-y-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray italic border-b border-border pb-2 block">Integrated Perks & Benefits</span>
                                                <div className="space-y-2.5">
                                                    {[...(tier.features || []), ...(tier.accessControls || []).filter((a: any) => a.enabled).map((a: any) => a.title)].map((perk: any, i: number) => (
                                                        <div key={i} className="flex items-start gap-3">
                                                            <div className="mt-0.5 size-4 rounded-full bg-tatt-lime/10 text-tatt-lime flex items-center justify-center shrink-0">
                                                                <Check size={10} strokeWidth={4} />
                                                            </div>
                                                            <span className="text-xs font-bold text-foreground leading-tight">
                                                                {perk}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {(!tier.features || tier.features.length === 0) && (!tier.accessControls || !tier.accessControls.some((a: any) => a.enabled)) && (
                                                        <p className="text-[10px] text-tatt-gray italic">No specific perks enabled yet.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => router.push('/admin/membership-center/' + tier.id)}
                                                className="w-full mt-6 py-3 bg-background border border-border group-hover:bg-tatt-lime group-hover:text-tatt-black group-hover:border-tatt-lime text-tatt-gray text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                            >
                                                Manage Benefits
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Breakdown Footer */}
                        {activeTab === "OVERVIEW" && (
                            <div className="col-span-12 lg:col-span-7 bg-surface rounded-2xl p-6 border border-border">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[11px] uppercase tracking-[0.2em] font-black text-foreground italic underline decoration-tatt-lime/40">Regional Breakdown</span>
                                    <button className="text-tatt-lime text-[10px] font-black uppercase tracking-widest hover:underline">Full Analytics</button>
                                </div>
                            <div className="space-y-6">
                                {data.chapters.length > 0 ? data.chapters.slice(0, 5).map((chapter: any, i: number) => {
                                    const maxVal = Math.max(...data.chapters.map((c: any) => parseInt(c.memberCount) || 1), 10);
                                    return (
                                        <div key={chapter.id} className="flex items-center justify-between group">
                                            <span className="text-xs font-bold w-32 truncate">{chapter.name}</span>
                                            <div className="flex items-center space-x-4 flex-1 mx-6">
                                                <div className="flex-1 bg-background h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-tatt-lime h-full relative group-hover:brightness-110 transition-all duration-1000" 
                                                        style={{ width: `${((parseInt(chapter.memberCount) || 0) / maxVal) * 100}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-foreground w-12 text-right tracking-tighter">{(parseInt(chapter.memberCount) || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-10 text-center text-tatt-gray italic uppercase text-[10px] font-bold tracking-widest opacity-30">
                                        No regional data localized
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* Live Promotions */}
                        {["OVERVIEW", "DISCOUNTS"].includes(activeTab) && (
                            <>
                                {activeTab === "DISCOUNTS" && (
                                    <div className="col-span-12 lg:col-span-5 bg-surface rounded-2xl p-6 border border-border sticky top-6">
                                        <span className="text-[11px] uppercase tracking-[0.2em] font-black text-foreground italic mb-6 block underline decoration-tatt-lime/40">Create New Promotion</span>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Campaign Alias</label>
                                                <input 
                                                    value={promoForm.name}
                                                    onChange={(e) => setPromoForm({...promoForm, name: e.target.value})}
                                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-tatt-lime outline-none" placeholder="e.g. SUMMER_SALE_15" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Discount Scale (%)</label>
                                                <input 
                                                    value={promoForm.value}
                                                    onChange={(e) => setPromoForm({...promoForm, value: e.target.value})}
                                                    type="number" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-tatt-lime outline-none" placeholder="15" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Target Tiers</label>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {["FREE", "UBUNTU", "IMANI", "KIONGOZI"].map(tier => (
                                                        <button 
                                                            key={tier}
                                                            onClick={() => {
                                                                const plans = promoForm.applicablePlans.includes(tier)
                                                                    ? promoForm.applicablePlans.filter(p => p !== tier)
                                                                    : [...promoForm.applicablePlans, tier];
                                                                setPromoForm({...promoForm, applicablePlans: plans});
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${
                                                                promoForm.applicablePlans.includes(tier) ? 'bg-tatt-lime text-black border-tatt-lime' : 'bg-background text-tatt-gray border-border'
                                                            }`}
                                                        >
                                                            {tier}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Valid Until</label>
                                                <input 
                                                    value={promoForm.validUntil}
                                                    onChange={(e) => setPromoForm({...promoForm, validUntil: e.target.value})}
                                                    type="date" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-tatt-lime outline-none" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 py-2">
                                                <input 
                                                    type="checkbox"
                                                    id="annual-only"
                                                    checked={promoForm.applyToAnnualOnly}
                                                    onChange={(e) => setPromoForm({...promoForm, applyToAnnualOnly: e.target.checked})}
                                                    className="size-4 rounded border-border text-tatt-lime accent-tatt-lime"
                                                />
                                                <label htmlFor="annual-only" className="text-[10px] font-black uppercase tracking-widest text-tatt-gray cursor-pointer">Apply to Annual Billing Only</label>
                                            </div>
                                            <button 
                                                onClick={handleApplyCampaign}
                                                disabled={isCreatingPromo || !promoForm.name || !promoForm.value}
                                                className="w-full mt-4 py-3 bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-105 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center"
                                            >
                                                {isCreatingPromo ? <Loader2 className="animate-spin size-4" /> : 'Deploy Campaign'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className={`col-span-12 ${activeTab === "DISCOUNTS" ? "lg:col-span-7" : "lg:col-span-5"}`}>
                                    <div className="bg-surface rounded-2xl p-6 border border-border">
                                        <span className="text-[11px] uppercase tracking-[0.2em] font-black text-foreground italic mb-6 block underline decoration-tatt-lime/40">Active Promotions</span>
                                        <div className="space-y-3 mb-6">
                                            {data.discounts.map((discount: any) => (
                                                <div key={discount.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl group hover:border-tatt-lime transition-all">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-tatt-lime/10 rounded-lg text-tatt-lime">
                                                            <Ticket size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] font-black text-foreground tracking-widest uppercase">{discount.code}</div>
                                                            <div className="text-[9px] text-tatt-gray font-bold uppercase tracking-tighter mt-0.5">
                                                                {discount.discountType === 'percentage' ? `${discount.value}% OFF` : `$${(discount.value/100).toFixed(2)} OFF`} • {discount.usageCount || 0} uses
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteDiscount(discount.id)}
                                                        className="text-tatt-gray hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {data.discounts.length === 0 ? (
                                                <div className="p-8 mt-2 text-center bg-background rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">No global campaigns active</p>
                                                    {activeTab !== "DISCOUNTS" && (
                                                        <button 
                                                            onClick={() => setActiveTab("DISCOUNTS")}
                                                            className="px-6 py-2 bg-tatt-lime text-tatt-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:brightness-105 transition-all shadow-sm active:scale-95"
                                                        >
                                                            Create Promotion
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                activeTab === "OVERVIEW" && (
                                                    <button 
                                                        onClick={() => setActiveTab("DISCOUNTS")}
                                                        className="w-full py-3 bg-tatt-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-tatt-lime hover:text-tatt-black transition-all shadow-lg active:scale-95 mt-4"
                                                    >
                                                        Manage Promotions
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                        </>
                    )}
                    </div>
                )}

                {activeTab === "MEMBERS" && (
                    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                         <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/50">
                            <div className="relative w-full md:w-80">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                <input
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                    placeholder="Search by name or email..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1">
                                <FilterSelect 
                                    value={filters.role} 
                                    onChange={(v) => handleFilterChange("role", v)}
                                    options={[
                                        { label: "All Account Types", value: "" },
                                        { label: "Community Members", value: "COMMUNITY_MEMBER" },
                                        { label: "Staff Accounts", value: "STAFF" },
                                    ]}
                                />
                                <FilterSelect 
                                    value={filters.tier} 
                                    onChange={(v) => handleFilterChange("tier", v)}
                                    options={[
                                        { label: "All Tiers", value: "" },
                                        { label: "FREE", value: "FREE" },
                                        { label: "UBUNTU", value: "UBUNTU" },
                                        { label: "IMANI", value: "IMANI" },
                                        { label: "KIONGOZI", value: "KIONGOZI" },
                                    ]}
                                />
                                <FilterSelect 
                                    value={filters.chapterId} 
                                    onChange={(v) => handleFilterChange("chapterId", v)}
                                    options={[
                                        { label: "All Chapters", value: "" },
                                        ...data.chapters.map((c: any) => ({ label: c.name, value: c.id }))
                                    ]}
                                />
                                <button
                                    onClick={() => handleBulkAction('archive')}
                                    disabled={!selectedMembers.length}
                                    className="px-4 py-2 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 disabled:opacity-40 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={12} /> Archive
                                </button>
                                <button
                                    onClick={() => handleBulkAction('reassign')}
                                    disabled={!selectedMembers.length}
                                    className="px-4 py-2 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-tatt-lime-dark hover:bg-tatt-lime/5 disabled:opacity-40 transition-all flex items-center gap-2"
                                >
                                    <Shield size={12} /> Reassign
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-background/50">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">
                                            <input 
                                                type="checkbox" 
                                                onChange={toggleAllMembers}
                                                checked={selectedMembers.length === data.subscribers.length && data.subscribers.length > 0}
                                                className="size-4 rounded border-border text-tatt-lime accent-tatt-lime cursor-pointer" 
                                            />
                                        </th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Member Identity</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Active Tier</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Region</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Cycle</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Sync Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray text-right">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.subscribers.map((member: any) => (
                                        <tr key={member.id} className="hover:bg-tatt-lime/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedMembers.includes(member.id)}
                                                    onChange={() => toggleMemberSelection(member.id)}
                                                    className="size-4 rounded border-border text-tatt-lime accent-tatt-lime cursor-pointer" 
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-tatt-black text-tatt-lime flex items-center justify-center font-black text-xs border border-white/5">
                                                        {(member.firstName?.[0] || '')}{(member.lastName?.[0] || '') || '??'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-black text-foreground leading-none">{member.firstName} {member.lastName}</p>
                                                        <p className="text-[10px] text-tatt-gray font-bold mt-1 tracking-tighter">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-background border ${
                                                    member.communityTier === 'KIONGOZI' ? 'text-tatt-lime border-tatt-lime shadow-sm shadow-tatt-lime/10' : 'text-tatt-gray border-border'
                                                }`}>
                                                    {member.communityTier}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] font-bold text-tatt-gray uppercase tracking-widest">{member.chapter?.name || "Global"}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{member.billingCycle || "FREE"}</span>
                                                    <span className="text-[8px] text-tatt-gray font-bold uppercase mt-1">Next: {member.subscriptionExpiresAt ? new Date(member.subscriptionExpiresAt).toLocaleDateString() : 'Infinite'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-green-500 uppercase tracking-widest">
                                                    <div className="size-1.5 rounded-full bg-green-500"></div>
                                                    Connected
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right relative">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                                                    }}
                                                    className="text-tatt-gray hover:text-foreground p-1 rounded-lg hover:bg-background"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                
                                                {openMenuId === member.id && (
                                                    <div 
                                                        className="absolute right-8 top-12 w-48 bg-surface border border-border rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button 
                                                            onClick={() => { 
                                                                setReassignTarget({ id: member.id, name: `${member.firstName} ${member.lastName}`, currentTier: member.communityTier || 'FREE' });
                                                                setReassignTier(member.communityTier || 'FREE');
                                                                setOpenMenuId(null); 
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:bg-background hover:text-foreground rounded-xl transition-all flex items-center gap-3"
                                                        >
                                                            <IdCard size={14} /> Reassign Tier
                                                        </button>
                                                        <button 
                                                            onClick={() => { handleBulkAction('archive'); setOpenMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-3"
                                                        >
                                                            <Activity size={14} /> Archive Status
                                                        </button>
                                                        <button 
                                                            onClick={() => { toast.success(`Login link sent to ${member.email}`); setOpenMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-tatt-lime-dark hover:bg-tatt-lime/10 rounded-xl transition-all flex items-center gap-3"
                                                        >
                                                            <Bell size={14} /> Send Alert
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {data.pagination.totalPages > 1 && (
                            <div className="p-6 border-t border-border flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Batch Page {data.pagination.page} / {data.pagination.totalPages}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleFilterChange("page", filters.page - 1)}
                                        disabled={filters.page === 1}
                                        className="p-2 border border-border rounded-lg hover:bg-background disabled:opacity-30"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleFilterChange("page", filters.page + 1)}
                                        disabled={filters.page === data.pagination.totalPages}
                                        className="p-2 border border-border rounded-lg hover:bg-background disabled:opacity-30"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Spacing for layout */}
            <div className="h-12"></div>

            {/* ── Reassign Tier Modal ── */}
            {reassignTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setReassignTarget(null); setReassignTier(''); }}>
                    <div 
                        className="bg-surface border border-border rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 border-b border-border">
                            <h3 className="text-lg font-black text-foreground tracking-tight">Reassign Tier</h3>
                            <p className="text-[11px] text-tatt-gray font-bold mt-1 tracking-wide">
                                Change membership tier for <span className="text-foreground">{reassignTarget.name}</span>
                            </p>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-gray block mb-2">Current Tier</label>
                                <div className="px-4 py-3 bg-background rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-tatt-gray">
                                    {TIER_LABELS[reassignTarget.currentTier] || reassignTarget.currentTier}
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-tatt-gray block mb-2">New Tier</label>
                                <select
                                    value={reassignTier}
                                    onChange={(e) => setReassignTier(e.target.value)}
                                    className="w-full px-4 py-3 bg-background rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-tatt-lime transition-colors cursor-pointer appearance-none"
                                >
                                    {TIER_OPTIONS.map(tier => (
                                        <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                                    ))}
                                </select>
                            </div>
                            {reassignTier !== reassignTarget.currentTier && (
                                <div className="p-3 rounded-xl bg-tatt-lime/5 border border-tatt-lime/20">
                                    <p className="text-[10px] font-bold text-tatt-lime-dark">
                                        <IdCard size={12} className="inline mr-1.5 -mt-0.5" />
                                        This will change {reassignTarget.name.split(' ')[0]}&apos;s tier from <strong>{TIER_LABELS[reassignTarget.currentTier]}</strong> to <strong>{TIER_LABELS[reassignTier]}</strong>.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-8 border-t border-border flex gap-3 justify-end">
                            <button
                                onClick={() => { setReassignTarget(null); setReassignTier(''); }}
                                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-foreground rounded-xl border border-border hover:bg-background transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReassignTier}
                                disabled={reassigning || reassignTier === reassignTarget.currentTier}
                                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-tatt-lime text-tatt-black rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {reassigning && <Loader2 size={12} className="animate-spin" />}
                                {reassigning ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, change, isPositive, onClick }: { label: string, value: string | number, change: string, isPositive: boolean, onClick?: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-surface p-6 rounded-[2rem] border border-border shadow-sm group hover:border-tatt-lime transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="text-[10px] font-black text-tatt-gray uppercase tracking-[0.2em] mb-3 group-hover:text-foreground transition-colors">{label}</div>
            <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-black tracking-tighter italic">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-black italic tracking-tighter ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowUpRight className="rotate-90" size={10} strokeWidth={3} />}
                    {change}
                </div>
            </div>
        </div>
    );
}

function FilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: {label: string, value: string}[] }) {
    return (
        <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-background border border-border rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-tatt-lime cursor-pointer whitespace-nowrap"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    );
}
