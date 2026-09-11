"use client";

import { useState, useEffect } from "react";
import { 
    Handshake, 
    Plus, 
    Search, 
    Filter, 
    Download, 
    Edit2, 
    MoreVertical, 
    ExternalLink, 
    LayoutGrid, 
    ShieldCheck, 
    Timer, 
    Users2,
    CheckCircle2,
    XCircle,
    Loader2,
    X,
    Building2,
    Mail,
    Globe,
    FileText,
    TrendingUp,
    ChevronDown,
    ImagePlus,
    Infinity,
    CircleDashed,
    Trash2
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "react-hot-toast";

interface Partnership {
    id: string;
    name: string;
    email: string;
    category: string;
    tierAccess: string[];
    quotaAmount: number | null;
    quotaUsed: number;
    status: 'ACTIVE' | 'INACTIVE';
    logoUrl?: string;
    description?: string;
    website?: string;
    buttonLabel?: string;
    redemptionLink?: string;
    contactName?: string;
    contactPosition?: string;
    quotaReset: 'MONTHLY' | 'ANNUAL';
    tierQuotas: Record<string, number | null>;
    fullPrice?: number;
    discountedPrice?: number;
    createdAt: string;
}

interface PartnershipStats {
    totalCount: number;
    activeCount: number;
    kiongoziSupportCount: number;
    quotaStats: {
        totalQuota: number | null;
        totalUsed: number;
    };
}

export default function PartnershipsPage() {
    const { user } = useAuth();
    const [partners, setPartners] = useState<Partnership[]>([]);
    const [stats, setStats] = useState<PartnershipStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Initial / Reset form values
    const initialFormData = {
        name: "",
        email: "",
        category: "Technology",
        tierAccess: ["UBUNTU"],
        quotaAmount: 0,
        status: "ACTIVE" as "ACTIVE" | "INACTIVE",
        description: "",
        logoUrl: "",
        website: "",
        contactName: "",
        contactPosition: "",
        buttonLabel: "Claim Benefit",
        redemptionLink: "",
        quotaReset: "MONTHLY" as "MONTHLY" | "ANNUAL",
        tierQuotas: { "UBUNTU": 0 } as Record<string, number | null>,
        fullPrice: 0,
        discountedPrice: 0
    };

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partnership | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const categories = ["Technology", "Healthcare", "Travel & Logistics", "Education", "Legal", "Other"];
    const allTiers = ["FREE", "UBUNTU", "IMANI", "KIONGOZI"];

    useEffect(() => {
        fetchData();
        // Load draft from localStorage if exists
        const savedDraft = localStorage.getItem("tatt_partnership_draft");
        if (savedDraft) {
            try {
                setFormData(JSON.parse(savedDraft));
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, []);

    // Save draft to localStorage only for NEW partners
    useEffect(() => {
        if (!editingPartner && isModalOpen) {
            localStorage.setItem("tatt_partnership_draft", JSON.stringify(formData));
        }
    }, [formData, editingPartner, isModalOpen]);

    const [filteredPartners, setFilteredPartners] = useState<Partnership[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        if (!partners) return;
        let result = [...partners];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(q) || 
                p.email.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }
        setFilteredPartners(result);
    }, [searchQuery, partners]);

    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(partners, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "tatt_partnerships_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [partnersRes, statsRes] = await Promise.all([
                api.get("/partnerships"),
                api.get("/partnerships/stats")
            ]);
            setPartners(partnersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch partnerships data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (partner: Partnership | null = null) => {
        setFormError(null);
        if (partner) {
            setEditingPartner(partner);
            setFormData({
                name: partner.name,
                email: partner.email,
                category: partner.category,
                tierAccess: partner.tierAccess,
                quotaAmount: partner.quotaAmount || 0,
                status: partner.status,
                description: partner.description || "",
                logoUrl: partner.logoUrl || "",
                website: partner.website || "",
                contactName: partner.contactName || "",
                contactPosition: partner.contactPosition || "",
                buttonLabel: partner.buttonLabel || "Claim Benefit",
                redemptionLink: partner.redemptionLink || "",
                quotaReset: partner.quotaReset || "MONTHLY",
                tierQuotas: partner.tierQuotas || {},
                fullPrice: partner.fullPrice || 0,
                discountedPrice: partner.discountedPrice || 0
            });
        } else {
            setEditingPartner(null);
            const savedDraft = localStorage.getItem("tatt_partnership_draft");
            if (savedDraft) {
                try {
                    setFormData(JSON.parse(savedDraft));
                } catch (e) {
                    setFormData(initialFormData);
                }
            } else {
                setFormData(initialFormData);
            }
        }
        setIsModalOpen(true);
    };

    const handleDiscardDraft = () => {
        setFormData(initialFormData);
        setEditingPartner(null);
        localStorage.removeItem("tatt_partnership_draft");
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFormError(null);

        try {
            const totalQuota = Object.values(formData.tierQuotas).reduce((acc: number, curr) => acc + (Number(curr) || 0), 0);
            const payload = {
                ...formData,
                quotaAmount: totalQuota,
                fullPrice: formData.fullPrice ? Number(formData.fullPrice) : null,
                discountedPrice: formData.discountedPrice ? Number(formData.discountedPrice) : null,
                tierQuotas: Object.fromEntries(
                    Object.entries(formData.tierQuotas).map(([k, v]) => [k, (v === 0 || v === null) ? null : Number(v)])
                )
            };
            console.log("[Partnerships] Outgoing Payload:", JSON.stringify(payload, null, 2));

            if (editingPartner) {
                await api.patch(`/partnerships/${editingPartner.id}`, payload);
            } else {
                await api.post("/partnerships", payload);
            }
            
            // Clean up everything after success
            localStorage.removeItem("tatt_partnership_draft");
            setFormData(initialFormData);
            setEditingPartner(null);
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Failed to save partnership:", error);
            const message = error.response?.data?.message;
            if (Array.isArray(message)) {
                setFormError(message[0]);
            } else if (typeof message === 'string') {
                setFormError(message);
            } else {
                setFormError("An unexpected error occurred. Please check all fields.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePartner = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this partnership? This action cannot be undone.")) return;

        try {
            await api.delete(`/partnerships/${id}`);
            toast.success("Partnership deleted successfully");
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete partnership");
        }
    };

    const toggleTier = (tier: string) => {
        setFormData(prev => {
            const isRemoving = prev.tierAccess.includes(tier);
            const newTiers = isRemoving 
                ? prev.tierAccess.filter(t => t !== tier)
                : [...prev.tierAccess, tier];
            
            const newQuotas = { ...prev.tierQuotas };
            if (isRemoving) {
                delete newQuotas[tier];
            } else {
                newQuotas[tier] = 0; // Default to 0 (Unlimited in UI logic)
            }

            const nextQuotaAmount = Object.values(newQuotas).reduce((acc: number, curr) => acc + (Number(curr) || 0), 0);

            return {
                ...prev,
                tierAccess: newTiers,
                tierQuotas: newQuotas,
                quotaAmount: nextQuotaAmount
            };
        });
    };

    const handleQuotaChange = (tier: string, value: string) => {
        const numValue = value === "" ? 0 : parseInt(value);
        setFormData((prev: typeof initialFormData) => {
            const nextTierQuotas: Record<string, number | null> = {
                ...prev.tierQuotas,
                [tier]: numValue
            };
            // Calculate total quota as sum of all tier quotas
            const nextQuotaAmount = Object.values(nextTierQuotas).reduce((acc: number, curr) => acc + (Number(curr) || 0), 0);
            return {
                ...prev,
                tierQuotas: nextTierQuotas,
                quotaAmount: nextQuotaAmount
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append("files", file);

        try {
            const res = await api.post("/uploads/media", formDataUpload, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data?.files?.[0]?.url) {
                setFormData(prev => ({ ...prev, logoUrl: res.data.files[0].url }));
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const getTierDistribution = (tier: string) => {
        if (!partners || partners.length === 0) return 0;
        const count = partners.filter(p => p.tierAccess?.includes(tier)).length;
        return Math.round((count / partners.length) * 100);
    };


    if (isLoading && !partners.length) {
        return (
            <div className="flex flex-col h-96 items-center justify-center space-y-4">
                <Loader2 className="size-10 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-medium">Loading Partnership Hub...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-tatt-black tracking-tight uppercase">Partnerships Hub</h1>
                    <p className="text-tatt-gray font-medium">Manage corporate alliances and membership tier exclusivity for the community.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-4 py-2 bg-surface border rounded-xl text-sm font-bold transition-all shadow-sm ${isFilterOpen ? 'border-tatt-lime text-tatt-lime' : 'border-border text-tatt-gray hover:bg-background'}`}
                    >
                        <Filter size={18} />
                        Filter
                    </button>

                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-2 bg-tatt-lime text-tatt-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                        <Plus size={18} strokeWidth={3} />
                        New Partner
                    </button>
                </div>
            </div>

            {/* Bento Stats Grid */}
            {(() => {
                const totalQ = stats?.quotaStats?.totalQuota || 0;
                const usedQ = stats?.quotaStats?.totalUsed || 0;
                let quotaPercent = 0;
                if (totalQ > 0) {
                    quotaPercent = Math.round((usedQ / totalQ) * 100);
                }
                const displayQuota = (totalQ > 0 && !Number.isNaN(quotaPercent)) ? `${quotaPercent}%` : "N/A";
                const safeProgress = (totalQ > 0 && !Number.isNaN(quotaPercent)) ? quotaPercent : 0;

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                <StatCard 
                    icon={<Handshake className="text-tatt-lime" />} 
                    label="Total Partners" 
                    value={stats?.totalCount || 0} 
                    trend="+12%" 
                    color="lime"
                />
                <StatCard 
                    icon={<ShieldCheck className="text-tatt-bronze" />} 
                    label="Kiongozi Tier" 
                    value={stats?.kiongoziSupportCount || 0} 
                    trend="Priority" 
                    color="bronze"
                />
                <StatCard 
                    icon={<Timer className="text-tatt-yellow" />} 
                    label="Active Alliances" 
                    value={stats?.activeCount || 0} 
                    trend="Across 3 regions" 
                    color="yellow"
                />
                        <StatCard 
                            icon={<TrendingUp className="text-tatt-gray" />} 
                            label="Quota Usage" 
                            value={displayQuota} 
                            progress={safeProgress}
                            color="gray"
                        />
                    </div>
                );
            })()}

            {/* Main Table Content */}
            <div className="bg-surface rounded-2xl border border-border shadow-sm">
                <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                        <input 
                            type="text" 
                            placeholder="Search partners by name, category, or email..." 
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-background/50 border-b border-border">
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest">Partner Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest">Tier Access</th>
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest">Quota</th>
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-tatt-gray uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPartners.length > 0 ? (
                                filteredPartners.map((partner) => (
                                    <tr key={partner.id} className="hover:bg-background/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-tatt-gray shrink-0 group-hover:border-tatt-lime/50 transition-colors">
                                                    {partner.logoUrl ? (
                                                        <img src={partner.logoUrl} alt={partner.name} className="size-8 object-contain" />
                                                    ) : (
                                                        <Building2 size={24} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-tatt-black">{partner.name}</p>
                                                    <p className="text-xs text-tatt-gray font-medium">{partner.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-3 py-1 bg-background border border-border rounded-full text-[10px] font-bold text-tatt-gray uppercase tracking-wider">
                                                {partner.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {partner.tierAccess.map(tier => (
                                                    <span key={tier} className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                                                        tier === 'KIONGOZI' ? 'bg-tatt-lime text-tatt-black' : 'bg-tatt-black text-white'
                                                    }`}>
                                                        {tier}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {partner.tierAccess.map(tier => {
                                                    const q = partner.tierQuotas?.[tier]; // Use optional chaining
                                                    return (
                                                        <div key={tier} className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-tatt-gray w-12">{tier}:</span>
                                                            <span className="text-[10px] font-bold text-tatt-black">
                                                                {q === 0 || q === undefined || q === null ? "Unlimited" : `${q} Units`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {partner.tierAccess.length === 0 && (
                                                    <p className="text-xs text-tatt-gray italic font-medium">None Set</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`size-2 rounded-full ${partner.status === 'ACTIVE' ? 'bg-tatt-lime' : 'bg-red-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${partner.status === 'ACTIVE' ? 'text-tatt-lime-dark' : 'text-red-600'}`}>
                                                    {partner.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative group/menu inline-block">
                                                <button className="p-2 text-tatt-gray hover:text-tatt-black hover:bg-background rounded-lg transition-all">
                                                    <MoreVertical size={18} />
                                                </button>
                                                <div className="absolute right-0 mt-0 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden hidden group-hover/menu:block text-left">
                                                    <button 
                                                        onClick={() => handleOpenModal(partner)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-tatt-gray hover:bg-border/30 hover:text-tatt-black transition-colors"
                                                    >
                                                        <Edit2 size={18} />
                                                        Edit Partnership
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeletePartner(partner.id, e)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors border-t border-border"
                                                    >
                                                        <Trash2 size={18} />
                                                        Delete Partnership
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-tatt-gray font-medium">
                                        No partnerships found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-background/30 border-t border-border flex items-center justify-between">
                    <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">
                        Showing {filteredPartners.length} of {partners.length} partners
                    </p>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-tatt-gray border border-border rounded-lg bg-surface opacity-50 cursor-not-allowed">Previous</button>
                        <button className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-tatt-black border border-border rounded-lg bg-surface hover:bg-background transition-all shadow-sm">Next</button>
                    </div>
                </div>
            </div>

            {/* Bottom Row / Insights */}
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-tatt-black rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl border border-white/5">
                    <div className="relative z-10 max-w-2xl">
                        <h4 className="text-2xl font-black uppercase tracking-tight mb-4">Tier Policy Breakdown</h4>
                        <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-lg">
                            Ensure partners are properly assigned to maintain the exclusivity of membership levels. This reflects the percentage of active partners accessible by each tier.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <UsageRow label="Sankofa Tier (Public)" current={getTierDistribution("FREE")} color="bg-tatt-gray" />
                            <UsageRow label="Ubuntu Tier (Inclusive)" current={getTierDistribution("UBUNTU")} color="bg-blue-500" />
                            <UsageRow label="Imani Tier (Enhanced)" current={getTierDistribution("IMANI")} color="bg-tatt-bronze" />
                            <UsageRow label="Kiongozi Tier (Elite)" current={getTierDistribution("KIONGOZI")} color="bg-tatt-lime" />
                        </div>
                    </div>
                    <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none">
                        <Handshake size={320} strokeWidth={1} />
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div 
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-tatt-black/80 backdrop-blur-md overflow-y-auto cursor-pointer"
                >
                    <div className="bg-surface w-full max-w-6xl rounded-[2rem] shadow-2xl border border-border overflow-hidden my-auto cursor-default">
                        <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50">
                            <div>
                                <nav className="flex gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray mb-1">
                                    <span>Partners</span>
                                    <span>/</span>
                                    <span className="text-tatt-lime-dark">{editingPartner ? "Edit Alliances" : "New Strategy"}</span>
                                </nav>
                                <h3 className="text-3xl font-black text-tatt-black uppercase tracking-tight">
                                    {editingPartner ? "Update Partnership" : "Add New Partnership"}
                                </h3>
                                <p className="text-sm font-medium text-tatt-gray">Configure organizational partnership and member access rules.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleDiscardDraft}
                                    className="px-6 py-2.5 rounded-xl border border-border font-bold text-tatt-gray hover:bg-surface transition-all active:scale-95"
                                >
                                    Discard Draft
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                    className="px-8 py-2.5 rounded-xl bg-tatt-black text-white font-black uppercase tracking-widest text-xs hover:bg-tatt-lime hover:text-tatt-black transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin size-4" /> : "Save Partnership"}
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar bg-surface">
                            <div className="grid grid-cols-12 gap-8">
                                {/* Left Column: Identity & Access */}
                                <div className="col-span-12 lg:col-span-8 space-y-8">
                                    {/* Partner Identity */}
                                    <div className="bg-background/40 p-8 rounded-2xl border border-border space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-tatt-lime/10 rounded-lg text-tatt-lime">
                                                <Building2 size={20} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tight text-tatt-black">Partner Identity</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Legal Partner Name</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                    className="w-full bg-white border border-border rounded-xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-gray-300" 
                                                    placeholder="e.g. Global Sky Airways"
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Value Proposition / Description</label>
                                                <textarea 
                                                    required
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                    rows={4}
                                                    className="w-full bg-white border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-medium resize-none" 
                                                    placeholder="Brief overview of the partnership benefits for TATT members..."
                                                />
                                            </div>
                                            <div className="space-y-2 relative">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Industry Category</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                                    className="w-full bg-white border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-bold flex items-center justify-between"
                                                >
                                                    <span className={formData.category === "Select a category" ? "text-tatt-gray" : ""}>{formData.category}</span>
                                                    <ChevronDown className={`text-tatt-gray transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} size={16} />
                                                </button>
                                                {isCategoryOpen && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                                                        {categories.map(c => (
                                                            <button 
                                                                key={c}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({...formData, category: c});
                                                                    setIsCategoryOpen(false);
                                                                }}
                                                                className="w-full px-6 py-4 text-left text-sm font-bold text-tatt-gray hover:bg-tatt-lime/10 hover:text-tatt-black transition-all border-b border-border last:border-0"
                                                            >
                                                                {c}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Official Website</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                                    <input 
                                                        required
                                                        type="url"
                                                        value={formData.website}
                                                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                                                        className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-bold" 
                                                        placeholder="https://globalsky.com"
                                                    />
                                                </div>
                                            </div>

                                            {/* Pricing Strategy */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Full Retail Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray font-bold text-sm">$</span>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.fullPrice === 0 ? "0" : (formData.fullPrice || "")}
                                                        onChange={(e) => setFormData({...formData, fullPrice: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                                                        className="w-full bg-white border border-border rounded-xl pl-8 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-bold" 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">TATT Member Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-lime-dark font-black text-sm">$</span>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.discountedPrice === 0 ? "0" : (formData.discountedPrice || "")}
                                                        onChange={(e) => setFormData({...formData, discountedPrice: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                                                        className="w-full bg-white border border-border rounded-xl pl-8 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-black text-tatt-lime-dark" 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Row: Exclusivity & Quota */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Exclusivity Settings */}
                                        <div className="bg-background/40 p-8 rounded-2xl border border-border">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 bg-tatt-bronze/10 rounded-lg text-tatt-bronze">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <h4 className="text-lg font-black uppercase tracking-tight text-tatt-black">Exclusivity Settings</h4>
                                            </div>
                                            <p className="text-xs font-bold text-tatt-gray mb-6 leading-relaxed">Select tiers eligible for this partner&apos;s perks.</p>
                                            <div className="space-y-3">
                                                {allTiers.map(tier => (
                                                    <button 
                                                        key={tier}
                                                        type="button"
                                                        onClick={() => toggleTier(tier)}
                                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                            formData.tierAccess.includes(tier)
                                                            ? 'bg-tatt-black text-tatt-lime border-tatt-black shadow-md'
                                                            : 'bg-white text-tatt-gray border-border hover:border-tatt-gray'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-black uppercase tracking-widest">{tier} Tier</span>
                                                        <CheckCircle2 size={16} className={formData.tierAccess.includes(tier) ? 'opacity-100' : 'opacity-20'} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quota Management */}
                                        <div className="bg-background/40 p-8 rounded-2xl border border-border">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 bg-tatt-yellow/10 rounded-lg text-tatt-yellow">
                                                    <Timer size={20} />
                                                </div>
                                                <h4 className="text-lg font-black uppercase tracking-tight text-tatt-black">Quota Configuration</h4>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    {formData.tierAccess.length > 0 ? (
                                                        formData.tierAccess.map(tier => (
                                                            <div key={tier} className="space-y-2 p-4 bg-white rounded-xl border border-border shadow-sm">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-tatt-black">{tier} QUOTA</span>
                                                                    <span className="text-[9px] font-bold text-tatt-gray">{formData.tierQuotas[tier] === 0 ? "UNLIMITED" : `${formData.tierQuotas[tier]} UNITS`}</span>
                                                                </div>
                                                                <div className="relative">
                                                                    <input 
                                                                        type="number"
                                                                        value={formData.tierQuotas[tier] === 0 ? "" : (formData.tierQuotas[tier] || "")}
                                                                        onChange={(e) => handleQuotaChange(tier, e.target.value)}
                                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-black focus:ring-2 focus:ring-tatt-lime outline-none" 
                                                                        placeholder="Unlimited"
                                                                    />
                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                                                                        {formData.tierQuotas[tier] === 0 ? <Infinity size={14} /> : <CircleDashed size={14} />}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-8 text-center bg-white rounded-xl border border-dashed border-border">
                                                            <p className="text-[10px] font-bold text-tatt-gray uppercase px-4">Select tiers to configure quotas</p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-2 border-t border-border pt-6">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Reset Cycle</label>
                                                    <div className="flex p-1 bg-white border border-border rounded-xl">
                                                        {(['MONTHLY', 'ANNUAL'] as const).map(period => (
                                                            <button 
                                                                key={period}
                                                                type="button"
                                                                onClick={() => setFormData({...formData, quotaReset: period})}
                                                                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                                                                    formData.quotaReset === period 
                                                                    ? 'bg-tatt-yellow text-tatt-black shadow-sm' 
                                                                    : 'text-tatt-gray hover:text-tatt-black'
                                                                }`}
                                                            >
                                                                {period}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Config */}
                                    <div className="bg-tatt-black p-10 rounded-[2rem] border border-white/5 relative overflow-hidden group shadow-2xl">
                                        <div className="absolute -right-20 -bottom-20 opacity-[0.05] group-hover:rotate-12 transition-transform">
                                            <Handshake size={320} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2 bg-tatt-lime/10 rounded-lg text-tatt-lime">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <h4 className="text-xl font-black uppercase tracking-tight text-white">Call To Action Config</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 px-1">Button Label</label>
                                                    <input 
                                                        required
                                                        value={formData.buttonLabel}
                                                        onChange={(e) => setFormData({...formData, buttonLabel: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-bold" 
                                                        placeholder="Claim Perk"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 px-1">Redemption URL</label>
                                                    <input 
                                                        required
                                                        type="url"
                                                        value={formData.redemptionLink}
                                                        onChange={(e) => setFormData({...formData, redemptionLink: e.target.value})}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-tatt-lime outline-none transition-all font-bold" 
                                                        placeholder="https://api.partner.com/v1/redeem"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Media & Contact */}
                                <div className="col-span-12 lg:col-span-4 space-y-8">
                                    {/* Logo Upload Box */}
                                    <div className="bg-surface p-8 rounded-2xl border border-border flex flex-col items-center text-center group transition-all">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray mb-8">Visual Identity</h4>
                                        <div 
                                            onClick={() => document.getElementById('logo-upload')?.click()}
                                            className={`w-full aspect-square bg-background border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-8 transition-all mb-6 cursor-pointer relative overflow-hidden ${isUploading ? 'opacity-50' : 'hover:border-tatt-lime hover:bg-tatt-lime/5'}`}
                                        >
                                            <input 
                                                id="logo-upload"
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                            />
                                            {formData.logoUrl ? (
                                                <img src={formData.logoUrl} alt="Logo Preview" className="absolute inset-0 w-full h-full object-contain p-8" />
                                            ) : (
                                                <>
                                                    <div className="size-20 bg-white border border-border rounded-full flex items-center justify-center shadow-sm text-tatt-gray group-hover:text-tatt-lime transition-colors mb-4">
                                                        {isUploading ? <Loader2 className="animate-spin" size={32} /> : <ImagePlus size={32} />}
                                                    </div>
                                                    <p className="text-sm font-bold text-tatt-black">Logo Upload</p>
                                                    <p className="text-[10px] text-tatt-gray mt-1 leading-relaxed">Directly upload your logo or paste a URL below.</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-full space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1 text-left block">Logo Image URL</label>
                                            <input 
                                                required
                                                value={formData.logoUrl}
                                                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none font-medium" 
                                                placeholder="https://cdn.com/logo.svg"
                                            />
                                        </div>
                                    </div>

                                    {/* Error Feedback */}
                                    {formError && (
                                        <div className="bg-white p-8 rounded-2xl border border-border">
                                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                                                <XCircle size={18} className="shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black uppercase tracking-widest">Saving Failed</p>
                                                    <p className="text-sm font-bold leading-relaxed">{formError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Primary Contact */}
                                    <div className="bg-surface p-8 rounded-2xl border border-border space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-tatt-black/5 rounded-lg text-tatt-black">
                                                <Users2 size={20} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tight text-tatt-black">Contact Personnel</h4>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Personnel Contact Name</label>
                                                <input 
                                                    required
                                                    value={formData.contactName}
                                                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none font-bold" 
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Verified Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                                    <input 
                                                        required
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                        className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-tatt-lime outline-none" 
                                                        placeholder="direct@corporate.com"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray px-1">Personnel Position</label>
                                                <input 
                                                    required
                                                    value={formData.contactPosition}
                                                    onChange={(e) => setFormData({...formData, contactPosition: e.target.value})}
                                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none font-bold" 
                                                    placeholder="e.g. Partnership Mgr"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* System Note */}
                                    <div className="bg-tatt-lime/10 p-6 rounded-2xl border border-tatt-lime/20">
                                        <div className="flex gap-4">
                                            <CheckCircle2 className="text-tatt-lime-dark shrink-0" size={20} />
                                            <div>
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-tatt-lime-dark mb-1">Establishment Note</h5>
                                                <p className="text-[11px] text-tatt-black/70 font-medium leading-relaxed">
                                                    Once established, this partnership will sync across all selected membership app instances immediately.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, trend, progress, color }: any) {
    const colorClasses: any = {
        lime: "border-tatt-lime/20",
        bronze: "border-tatt-bronze/20",
        yellow: "border-tatt-yellow/20",
        gray: "border-tatt-gray/20"
    };

    return (
        <div className={`bg-surface p-6 rounded-2xl border ${colorClasses[color]} shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow`}>
            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-background rounded-lg border border-border group-hover:bg-surface transition-colors">
                    {icon}
                </div>
                <p className="text-[10px] font-black text-tatt-gray uppercase tracking-[0.2em]">{label}</p>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-tatt-black tracking-tight">{value}</span>
                {trend && <span className={`text-[10px] font-black uppercase ${trend.startsWith('+') ? 'text-tatt-lime-dark' : 'text-tatt-gray'}`}>{trend}</span>}
            </div>
            {progress !== undefined && (
                <div className="mt-4 space-y-2">
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${progress > 80 ? 'bg-red-500' : 'bg-tatt-lime'}`} 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UsageRow({ label, current, color }: { label: string, current: number, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">{label}</span>
                <span className="text-xs font-black">{current}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${current}%` }}></div>
            </div>
        </div>
    );
}
