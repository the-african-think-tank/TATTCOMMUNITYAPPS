"use client";

import React, { useState, useEffect } from "react";
import { 
    Send, 
    Megaphone, 
    Clock, 
    PlusCircle, 
    SquarePen, 
    Globe, 
    Building2, 
    Search, 
    MoreVertical, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Trash2,
    Edit2,
    Hash,
    Filter,
    UserCog,
    Layers,
    FileText,
    CheckCircle2,
    History,
    ShieldCheck,
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface Broadcast {
    id: string;
    title: string;
    message: string;
    audienceType: 'ALL' | 'ORG_MEMBERS' | 'TIER_SPECIFIC';
    targetTier?: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
    scheduledAt?: string;
    sentAt?: string;
    createdAt: string;
}

interface Interest {
    id: string;
    name: string;
}

interface Industry {
    id: string;
    name: string;
}

const Tiers = ["FREE", "UBUNTU", "IMANI", "KIONGOZI"];

export default function PlatformManagement() {
    const [activeTab, setActiveTab] = useState<'ANNOUNCEMENTS' | 'INTERESTS' | 'INDUSTRIES' | 'TERMS'>('ANNOUNCEMENTS');
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [interests, setInterests] = useState<Interest[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(true);

    // Terms of Service
    const [termsContent, setTermsContent] = useState("");
    const [termsHistory, setTermsHistory] = useState<any[]>([]);
    const [activeTerms, setActiveTerms] = useState<any | null>(null);
    const [termsLoading, setTermsLoading] = useState(false);
    const [termsSubmitting, setTermsSubmitting] = useState(false);
    
    // Broadcast Form States
    const [title, setTitle] = useState("");
    const [audience, setAudience] = useState<'ALL' | 'ORG_MEMBERS' | 'TIER_SPECIFIC'>('ALL');
    const [targetTier, setTargetTier] = useState("UBUNTU");
    const [message, setMessage] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search & Taxonomy States
    const [searchTerm, setSearchTerm] = useState("");
    const [taxoSearch, setTaxoSearch] = useState("");
    const [newValue, setNewValue] = useState("");
    const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);
    const [telemetry, setTelemetry] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'TERMS') fetchTermsData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bRes, iRes, indRes, telRes] = await Promise.all([
                api.get("/admin/broadcasts"),
                api.get("/interests"),
                api.get("/industries"),
                api.get("/admin/settings/telemetry")
            ]);
            setBroadcasts(bRes.data);
            setInterests(iRes.data);
            setIndustries(indRes.data);
            setTelemetry(telRes.data);
        } catch (error) {
            toast.error("Failed to load platform data");
        } finally {
            setLoading(false);
        }
    };

    const fetchTermsData = async () => {
        setTermsLoading(true);
        try {
            const [histRes, activeRes] = await Promise.all([
                api.get("/terms/history"),
                api.get("/terms/active"),
            ]);
            setTermsHistory(Array.isArray(histRes.data) ? histRes.data : []);
            setActiveTerms(activeRes.data);
            if (activeRes.data?.content) setTermsContent(activeRes.data.content);
        } catch {
            // No terms yet
        } finally {
            setTermsLoading(false);
        }
    };

    const handlePublishTerms = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsContent.trim()) { toast.error("Content cannot be empty"); return; }
        if (!confirm("Publish this as the new Terms of Service? All users will be notified.")) return;
        setTermsSubmitting(true);
        try {
            await api.post("/terms/publish", { content: termsContent });
            toast.success("Terms of Service published. Users have been notified.");
            fetchTermsData();
        } catch {
            toast.error("Failed to publish Terms of Service");
        } finally {
            setTermsSubmitting(false);
        }
    };

    const handleBroadcastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload = {
                title,
                audienceType: audience,
                targetTier: audience === 'TIER_SPECIFIC' ? targetTier : null,
                message,
                scheduledAt: isScheduling ? scheduledAt : null,
                status: isScheduling ? 'SCHEDULED' : 'SENT'
            };
            await api.post("/admin/broadcasts", payload);
            toast.success(isScheduling ? "Announcement Scheduled" : "Announcement Broadcasted");
            setTitle("");
            setMessage("");
            setScheduledAt("");
            setIsScheduling(false);
            fetchData();
        } catch (error: any) {
            const errMsg = error?.response?.data?.message || error?.message || "Internal server error";
            toast.error(`Broadcast Failed: ${errMsg}`);
            console.error("Broadcast Error Details:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTaxonomySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue) return;
        const endpoint = activeTab === 'INTERESTS' ? '/interests' : '/industries';
        try {
            if (editingItem) {
                await api.patch(`${endpoint}/${editingItem.id}`, { name: newValue });
                toast.success(`${activeTab === 'INTERESTS' ? 'Interest' : 'Industry'} updated`);
            } else {
                await api.post(endpoint, { name: newValue });
                toast.success(`New ${activeTab === 'INTERESTS' ? 'interest' : 'industry'} added`);
            }
            setNewValue("");
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error("Process failed");
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const endpoint = activeTab === 'INTERESTS' ? '/interests' : '/industries';
        try {
            await api.delete(`${endpoint}/${id}`);
            toast.success("Removed successfuly");
            fetchData();
        } catch (error) {
            toast.error("Deletion failed");
        }
    };

    const filteredBroadcasts = broadcasts.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const taxonomyList = activeTab === 'INTERESTS' ? interests : industries;
    const filteredTaxonomy = taxonomyList.filter(item => 
        item.name.toLowerCase().includes(taxoSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-1">
                    <h3 className="text-3xl font-black tracking-tight text-foreground italic uppercase">Platform Management</h3>
                    <p className="text-tatt-gray font-medium">Govern platform communications and taxonomies</p>
                </div>
                <div className="flex gap-4">
                    {/* Header actions can go here in the future */}
                </div>
            </div>

            {/* System Vitality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 bg-tatt-black border border-tatt-lime/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group hover:border-tatt-lime transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Send size={80} className="text-tatt-lime" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="size-12 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime ring-1 ring-tatt-lime/20">
                            <Send size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray italic">Transactional Email Tracker</p>
                            <h4 className="text-4xl font-black text-white tracking-tighter mt-1 tabular-nums">
                                {telemetry?.totalEmailsSent?.toLocaleString() || "0"}
                            </h4>
                            <p className="text-[9px] font-bold text-tatt-lime mt-1 uppercase tracking-tighter">Verified Emails Dispatched</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 bg-surface border border-border rounded-[2rem] p-8 flex items-center justify-between gap-8">
                   <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={`size-3 rounded-full ${telemetry?.status === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-xs font-black uppercase tracking-widest text-foreground">Infrastructure Status: {telemetry?.status || 'INIT'}</span>
                        </div>
                        <p className="text-xs text-tatt-gray font-medium max-w-md">The mail transport engine is operating at peak capacity. All successful handshakes with the SMTP gateway are recorded in real-time.</p>
                   </div>
                   <div className="hidden lg:block">
                        <div className="px-6 py-3 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-tatt-gray">
                            Last Sync: {telemetry?.serverTime ? new Date(telemetry.serverTime).toLocaleTimeString() : 'N/A'}
                        </div>
                   </div>
                </div>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex p-1 bg-surface border border-border rounded-2xl w-full max-w-4xl overflow-x-auto no-scrollbar">
                {[
                    { id: 'ANNOUNCEMENTS', icon: Megaphone, label: 'Announcements' },
                    { id: 'INTERESTS', icon: Hash, label: 'Interests' },
                    { id: 'INDUSTRIES', icon: Layers, label: 'Industries' },
                    { id: 'TERMS', icon: FileText, label: 'Terms of Service' },
                    { id: 'ROLE_ALLOCATION', icon: UserCog, label: 'Role Allocation', href: '/admin/platform/roles' },
                ].map((tab) => {
                    if (tab.href) {
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-tatt-gray hover:text-foreground`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </Link>
                        );
                    }
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setNewValue("");
                                setEditingItem(null);
                            }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? 'bg-background text-tatt-lime border border-border shadow-sm ring-1 ring-tatt-lime/10' 
                                : 'text-tatt-gray hover:text-foreground'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'ANNOUNCEMENTS' && (
                <div className="grid grid-cols-12 gap-8">
                    {/* Create Announcement */}
                    <div className="col-span-12 xl:col-span-4 space-y-6">
                        <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                            <div className="p-8 border-b border-border bg-surface/50">
                                <div className="flex items-center gap-4 text-tatt-lime">
                                    <SquarePen size={24} />
                                    <h5 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Composer</h5>
                                </div>
                            </div>
                            <form onSubmit={handleBroadcastSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray ml-2">Title</label>
                                    <input 
                                        className="w-full h-12 bg-background border border-border rounded-xl px-6 text-sm font-bold outline-none border focus:border-tatt-lime transition-all"
                                        placeholder="Headline..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)} required
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray ml-2">Target Audience</label>
                                    <select 
                                        className="w-full h-12 bg-background border border-border rounded-xl px-4 text-xs font-black uppercase tracking-widest outline-none border focus:border-tatt-lime transition-all"
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value as any)}
                                    >
                                        <option value="ALL">ALL MEMBERS</option>
                                        <option value="ORG_MEMBERS">ORG MEMBERS ONLY</option>
                                        <option value="TIER_SPECIFIC">BY MEMBERSHIP TIER</option>
                                    </select>
                                    
                                    {audience === 'TIER_SPECIFIC' && (
                                        <div className="flex gap-2 pt-2 overflow-x-auto pb-2">
                                            {Tiers.map(t => (
                                                <button 
                                                    key={t} type="button"
                                                    onClick={() => setTargetTier(prev => prev === t ? "" : t)}
                                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${targetTier === t ? 'bg-tatt-black text-tatt-lime border-tatt-lime' : 'border-border text-tatt-gray'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray ml-2">Content</label>
                                    <textarea 
                                        className="w-full bg-background border border-border rounded-2xl p-6 text-sm font-medium min-h-[140px] focus:ring-1 focus:ring-tatt-lime/20 outline-none transition-all resize-none"
                                        placeholder="Message body..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)} required
                                    />
                                </div>

                                <div className="pt-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={isScheduling} onChange={(e) => setIsScheduling(e.target.checked)} className="size-4 accent-tatt-lime"/>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Delayed Delivery</span>
                                    </div>
                                    {isScheduling && (
                                        <input type="datetime-local" className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}/>
                                    )}
                                </div>

                                <button type="submit" disabled={isSubmitting} className="w-full bg-tatt-lime text-tatt-black h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-tatt-lime/20 transition-all">
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18}/>}
                                    {isSubmitting ? 'Transmitting...' : 'Dispatch Now'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Announcement History */}
                    <div className="col-span-12 xl:col-span-8">
                        <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                            <div className="p-8 border-b border-border flex justify-between items-center bg-surface/50 flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <Megaphone size={24} className="text-tatt-lime" />
                                    <h5 className="text-xl font-black uppercase italic tracking-tighter">Communications Log</h5>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray" size={16} />
                                    <input 
                                        className="h-10 bg-background border border-border rounded-xl pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none w-48 focus:border-tatt-lime"
                                        placeholder="Scan Subject..."
                                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-background/40">
                                        <tr>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-tatt-gray">Header</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-tatt-gray">Target</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-tatt-gray">Status</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-tatt-gray">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredBroadcasts.map(b => (
                                            <tr key={b.id} className="group hover:bg-background/20">
                                                <td className="px-8 py-5">
                                                    <p className="text-sm font-black italic tracking-tight">{b.title}</p>
                                                    <p className="text-[10px] text-tatt-gray truncate max-w-[200px]">{b.message}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-tatt-lime underline decoration-2 underline-offset-4">
                                                        {b.targetTier || b.audienceType}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${b.status === 'SENT' ? 'bg-tatt-lime/10 text-tatt-lime' : 'bg-surface border border-border text-tatt-gray'}`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] font-bold text-tatt-gray">
                                                    {new Date(b.sentAt || b.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'INTERESTS' || activeTab === 'INDUSTRIES') && (
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Management Component */}
                    <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                        <div className="p-8 border-b border-border bg-surface/50 flex flex-col md:flex-row justify-between md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-[1.5rem] bg-tatt-lime/10 flex items-center justify-center text-tatt-lime ring-4 ring-tatt-lime/5">
                                    {activeTab === 'INTERESTS' ? <Hash size={28} /> : <Layers size={28} />}
                                </div>
                                <div>
                                    <h5 className="text-2xl font-black uppercase italic tracking-tighter">
                                        Community {activeTab === 'INTERESTS' ? 'Interests' : 'Industries'}
                                    </h5>
                                    <p className="text-xs font-medium text-tatt-gray uppercase tracking-widest">Global Taxonomy Governance</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleTaxonomySubmit} className="flex gap-4 items-end">
                                <div className="space-y-1.5 flex-1 md:w-64">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-tatt-gray ml-4">
                                        {editingItem ? 'Updating Record' : `Define New ${activeTab === 'INTERESTS' ? 'Interest' : 'Industry'}`}
                                    </label>
                                    <input 
                                        className="w-full h-14 bg-background border border-border rounded-2xl px-6 text-sm font-bold outline-none focus:border-tatt-lime focus:ring-2 focus:ring-tatt-lime/10 transition-all"
                                        placeholder={`e.g. ${activeTab === 'INTERESTS' ? 'FinTech' : 'Agriculture'}`}
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)} required
                                    />
                                </div>
                                <button className="h-14 px-8 bg-tatt-black text-tatt-lime rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10">
                                    <PlusCircle size={18} />
                                    {editingItem ? 'Update' : 'Save'}
                                </button>
                                {editingItem && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setEditingItem(null); setNewValue(""); }}
                                        className="h-14 px-4 bg-surface border border-border text-tatt-gray rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                    >Cancel</button>
                                )}
                            </form>
                        </div>

                        <div className="p-8 bg-background/30 backdrop-blur-sm">
                            <div className="flex gap-4 mb-8">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-tatt-gray/40 group-focus-within:text-tatt-lime transition-colors" size={20} />
                                    <input 
                                        className="w-full h-14 bg-background border border-border rounded-2xl pl-14 pr-6 text-sm font-bold outline-none focus:border-tatt-lime transition-all"
                                        placeholder="Filter unit keys..."
                                        value={taxoSearch}
                                        onChange={(e) => setTaxoSearch(e.target.value)}
                                    />
                                </div>
                                <div className="bg-surface px-6 h-14 rounded-2xl border border-border flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Active Units:</span>
                                    <span className="text-xl font-black italic text-foreground">{taxonomyList.length}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {loading ? (
                                    <div className="col-span-full py-20 flex flex-col items-center gap-4 opacity-30">
                                        <Loader2 className="animate-spin" size={32} />
                                        <span className="text-xs font-black uppercase tracking-widest">Awaiting Archive Access...</span>
                                    </div>
                                ) : filteredTaxonomy.map(item => (
                                    <div key={item.id} className="group bg-surface hover:bg-tatt-black border border-border hover:border-tatt-lime p-5 rounded-3xl transition-all flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="size-8 rounded-xl bg-tatt-gray/5 flex items-center justify-center text-tatt-gray group-hover:bg-tatt-lime group-hover:text-tatt-black transition-colors">
                                                <span className="text-xs font-bold italic">#</span>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-foreground group-hover:text-white transition-colors">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                                            <button 
                                                onClick={() => { setEditingItem(item); setNewValue(item.name); }}
                                                className="size-9 rounded-xl bg-surface/10 flex items-center justify-center text-white hover:bg-tatt-lime hover:text-black transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => deleteItem(item.id)}
                                                className="size-9 rounded-xl bg-surface/10 flex items-center justify-center text-white hover:bg-red-500 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TERMS' && (
                <div className="grid grid-cols-12 gap-8">
                    {/* Editor */}
                    <div className="col-span-12 xl:col-span-7">
                        <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                            <div className="p-8 border-b border-border bg-surface/50 flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h5 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Terms of Service Editor</h5>
                                    <p className="text-xs text-tatt-gray font-medium uppercase tracking-widest">
                                        {activeTerms ? `Currently Active: Version ${activeTerms.version}` : 'No terms published yet'}
                                    </p>
                                </div>
                            </div>

                            {termsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-tatt-lime" size={32} />
                                </div>
                            ) : (
                                <form onSubmit={handlePublishTerms} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray ml-2">Content</label>
                                        <textarea
                                            className="w-full bg-background border border-border rounded-2xl p-6 text-sm font-medium min-h-[400px] focus:ring-1 focus:ring-tatt-lime/20 outline-none transition-all resize-y font-mono"
                                            placeholder="Enter the full Terms of Service content here. Supports plain text or markdown-style formatting..."
                                            value={termsContent}
                                            onChange={(e) => setTermsContent(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="p-4 rounded-2xl bg-tatt-lime/5 border border-tatt-lime/20 flex items-start gap-3">
                                        <CheckCircle2 size={16} className="text-tatt-lime shrink-0 mt-0.5" />
                                        <p className="text-xs text-tatt-gray leading-relaxed">
                                            Publishing will <strong className="text-foreground">archive the current version</strong> and send an in-app notification and system broadcast to <strong className="text-foreground">all active members</strong>. This action is logged with your name and timestamp.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={termsSubmitting}
                                        className="w-full bg-tatt-lime text-tatt-black h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-tatt-lime/20 transition-all disabled:opacity-60"
                                    >
                                        {termsSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                        {termsSubmitting ? 'Publishing...' : 'Publish New Version'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Version History */}
                    <div className="col-span-12 xl:col-span-5">
                        <div className="bg-surface border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                            <div className="p-8 border-b border-border bg-surface/50 flex items-center gap-4">
                                <History size={22} className="text-tatt-lime" />
                                <h5 className="text-xl font-black uppercase italic tracking-tighter">Version History</h5>
                            </div>
                            <div className="divide-y divide-border">
                                {termsLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="animate-spin text-tatt-lime" size={28} />
                                    </div>
                                ) : termsHistory.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <FileText size={40} className="mx-auto text-tatt-gray opacity-30 mb-3" />
                                        <p className="text-xs font-bold text-tatt-gray uppercase tracking-widest">No versions published yet</p>
                                    </div>
                                ) : termsHistory.map((t) => (
                                    <div key={t.id} className={`p-6 flex items-start gap-4 transition-colors hover:bg-background/30 ${t.isActive ? 'bg-tatt-lime/5' : ''}`}>
                                        <div className={`size-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                            t.isActive ? 'bg-tatt-lime text-tatt-black' : 'bg-surface border border-border text-tatt-gray'
                                        }`}>
                                            v{t.version}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-black text-foreground">Version {t.version}</span>
                                                {t.isActive && (
                                                    <span className="px-2 py-0.5 bg-tatt-lime/20 text-tatt-lime text-[9px] font-black uppercase tracking-widest rounded-full">Active</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-tatt-gray mt-1">
                                                Published by{' '}
                                                <span className="font-bold text-foreground">
                                                    {t.updatedBy ? `${t.updatedBy.firstName} ${t.updatedBy.lastName}` : 'Admin'}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-tatt-gray/70 mt-0.5">
                                                {new Date(t.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
