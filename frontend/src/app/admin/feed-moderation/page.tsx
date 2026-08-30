"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ShieldCheck,
    MessageSquare,
    AlertCircle,
    Trash2,
    CheckCircle2,
    Ban,
    ExternalLink,
    RefreshCcw,
    Zap,
    TrendingUp,
    Calendar,
    Clock,
    Megaphone,
    Rocket,
    X,
    Loader2
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

export default function FeedModerationPage() {
    const [stats, setStats] = useState({
        reportsHandled: 0,
        activeDiscussions: 0,
        flaggedUsers: 0
    });
    const [liveFeed, setLiveFeed] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Curation State
    const [activeInsight, setActiveInsight] = useState<any>(null);
    const [activePrompt, setActivePrompt] = useState<any>(null);
    const [insightForm, setInsightForm] = useState({ title: "", content: "", startDate: "" });
    const [promptInput, setPromptInput] = useState("");
    const [isDeploying, setIsDeploying] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, feedRes, reportsRes, curationRes] = await Promise.all([
                api.get("/admin/feed/stats"),
                api.get("/feed?limit=8"),
                api.get("/admin/feed/reports"),
                api.get("/feed/curation/active")
            ]);
            setStats(statsRes.data);
            setLiveFeed(feedRes.data.data);
            setReports(reportsRes.data);
            setActiveInsight(curationRes.data.insight);
            setActivePrompt(curationRes.data.prompt);
        } catch (error) {
            console.error("Failed to fetch moderation data", error);
            toast.error("Failed to load moderation workspace");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleReportAction = async (reportId: string, action: 'RESOLVE' | 'DISMISS') => {
        try {
            await api.patch(`/admin/feed/reports/${reportId}`, { action });
            toast.success(`Report ${action === 'RESOLVE' ? 'resolved' : 'dismissed'}`);
            fetchData();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to permanently remove this post?")) return;
        try {
            await api.delete(`/admin/feed/posts/${postId}`);
            toast.success("Post removed");
            setLiveFeed(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const handleShadowBanPost = async (postId: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/feed/posts/${postId}/shadow-ban`, { status: !currentStatus });
            toast.success(`Post reach ${!currentStatus ? 'limited' : 'restored'}`);
            setLiveFeed(prev => prev.map(p => p.id === postId ? { ...p, isShadowBanned: !currentStatus } : p));
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleShadowBanUser = async (userId: string) => {
        if (!confirm("Shadow ban this user? Their future posts will be hidden from the general feed.")) return;
        try {
            await api.patch(`/admin/feed/users/${userId}/shadow-ban`, { status: true });
            toast.success("User shadow banned");
            fetchData();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleDeployInsight = async () => {
        if (!insightForm.title || !insightForm.content) {
            toast.error("Please fill in heading and content");
            return;
        }
        setIsDeploying(true);
        try {
            const res = await api.post("/admin/feed/insights", insightForm);
            setActiveInsight(res.data);
            setInsightForm({ title: "", content: "", startDate: "" });
            toast.success("Insight deployed to feed");
        } catch (error) {
            toast.error("Deployment failed");
        } finally {
            setIsDeploying(false);
        }
    };

    const handleRotatePrompt = async () => {
        setIsRotating(true);
        try {
            const res = await api.post("/admin/feed/prompts/rotate");
            if (res.data) {
                setActivePrompt(res.data);
                toast.success("Community prompt rotated");
            } else {
                toast.error("No prompts available to rotate. Add prompts in DB.");
            }
        } catch (error) {
            toast.error("Rotation failed");
        } finally {
            setIsRotating(false);
        }
    };

    const handleDeleteInsight = async (id: string) => {
        if (!confirm("Remove this insight from the community stream?")) return;
        try {
            await api.delete(`/admin/feed/insights/${id}`);
            setActiveInsight(null);
            toast.success("Insight node deactivated");
        } catch (error) {
            toast.error("Failed to deactivate insight");
        }
    };

    const handleCreatePrompt = async () => {
        if (!promptInput.trim()) return;
        try {
            await api.post("/admin/feed/prompts", { prompt: promptInput });
            setPromptInput("");
            toast.success("New prompt node integrated. Rotate to activate.");
        } catch (error) {
            toast.error("Prompt integration failed");
        }
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto w-full pb-12">
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <ShieldCheck className="text-tatt-lime" size={28} />
                        Forum Moderation Workspace
                    </h1>
                    <p className="text-sm text-tatt-gray font-medium mt-1">Manage community standards and content reach</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                    {refreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}
                    Refresh Workspace
                </button>
            </div>

            {/* Stats Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Reports Handled" 
                    value={stats.reportsHandled.toLocaleString()} 
                    trend="+12%" 
                    icon={<CheckCircle2 className="text-tatt-lime-dark" />} 
                />
                <StatCard 
                    label="Active Discussions" 
                    value={stats.activeDiscussions.toString()} 
                    trend="-5%" 
                    trendType="down"
                    icon={<MessageSquare className="text-blue-500" />} 
                />
                <StatCard 
                    label="Flagged Users" 
                    value={stats.flaggedUsers.toString()} 
                    trend="+8%" 
                    icon={<Ban className="text-red-500" />} 
                />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Feed and Reports */}
                <section className="xl:col-span-2 space-y-8">
                    {/* Live Feed Management */}
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                <Megaphone className="text-tatt-lime size-3" />
                                Live Feed Management
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4">Timestamp</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Content Preview</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="size-6 animate-spin text-tatt-lime" />
                                                    <span className="font-black uppercase tracking-tighter text-[10px]">Syncing ecosystem nodes...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : liveFeed.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm font-medium">Feed is currently dormant</td>
                                        </tr>
                                    ) : (
                                        liveFeed.map(post => (
                                            <tr key={post.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase italic">
                                                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shadow-sm">
                                                            {post.author.profilePicture ? (
                                                                <img src={post.author.profilePicture} alt="" className="size-full object-cover" />
                                                            ) : (
                                                                <div className="size-full flex items-center justify-center text-[10px] font-black bg-tatt-lime text-tatt-black">
                                                                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-900">{post.author.firstName} {post.author.lastName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-md">
                                                        <p className="text-xs text-slate-600 line-clamp-1 font-medium leading-relaxed">{post.content}</p>
                                                        {post.isShadowBanned && (
                                                            <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter flex items-center gap-1 mt-1 bg-red-50 w-fit px-1.5 py-0.5 rounded">
                                                                <Zap size={10} className="fill-red-500" /> Limited Reach (Shadow Banned)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            className={`p-2 rounded-lg transition-colors ${post.isShadowBanned ? 'bg-tatt-lime/10 text-tatt-lime-dark' : 'text-slate-400 hover:text-tatt-lime hover:bg-slate-100'}`} 
                                                            title={post.isShadowBanned ? "Restore Reach" : "Shadow Ban Post"}
                                                            onClick={() => handleShadowBanPost(post.id, post.isShadowBanned)}
                                                        >
                                                            <Zap className={`size-4 ${post.isShadowBanned ? 'fill-tatt-lime' : ''}`} />
                                                        </button>
                                                        <button 
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                                            title="Permanently Remove"
                                                            onClick={() => handleDeletePost(post.id)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reported Content Queue */}
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-red-50/30">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                <AlertCircle className="text-red-500 size-3" />
                                Reported Content Queue
                                <span className="ml-3 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">
                                    {reports.length} New
                                </span>
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {reports.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="size-16 bg-tatt-lime/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-tatt-lime/20">
                                        <ShieldCheck className="text-tatt-lime" size={32} />
                                    </div>
                                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Workspace Clean</p>
                                    <p className="text-[10px] text-slate-400 font-medium italic mt-1">No pending reports require investigation.</p>
                                </div>
                            ) : (
                                reports.map(report => (
                                    <div key={report.id} className="p-8 hover:bg-red-50/20 transition-colors flex flex-col sm:flex-row gap-6">
                                        <div className="flex-1 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                                                         <img src={report.post.author.profilePicture || `https://ui-avatars.com/api/?name=${report.post.author.firstName}&background=9fcc00&color=000&bold=true`} alt="" className="size-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">{report.post.author.firstName} {report.post.author.lastName}</p>
                                                        <p className="text-[10px] text-tatt-gray font-bold uppercase italic tracking-tighter">
                                                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })} • Reported by {report.reporter.firstName}
                                                        </p>
                                                    </div>
                                                    <span className="ml-4 bg-red-100/50 text-red-700 text-[10px] font-black tracking-[0.1em] px-3 py-1 rounded-lg border border-red-200">
                                                        {report.reason}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 italic relative font-medium leading-relaxed shadow-inner">
                                                "{report.post.content}"
                                                <div className="absolute top-4 right-4">
                                                    <Link href={`/dashboard/feed/${report.post.id}`} target="_blank" className="p-2 bg-white border border-border rounded-xl text-tatt-gray hover:text-tatt-lime hover:border-tatt-lime transition-all shadow-sm block">
                                                        <ExternalLink size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                <button 
                                                    onClick={() => handleReportAction(report.id, 'DISMISS')}
                                                    className="px-6 py-3 bg-white border border-border text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                                >
                                                    Keep Post
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        handleDeletePost(report.post.id);
                                                        handleReportAction(report.id, 'RESOLVE');
                                                    }}
                                                    className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
                                                >
                                                    Delete Post
                                                </button>
                                                <button 
                                                    onClick={() => handleShadowBanUser(report.post.author.id)}
                                                    className="px-6 py-3 bg-tatt-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-125 transition-all shadow-xl shadow-black/20"
                                                >
                                                    Shadow Ban User
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* Right Column: Trending and Prompt */}
                <aside className="space-y-8">
                    {/* Trending Insights */}
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                <TrendingUp className="text-tatt-lime size-3" />
                                Trending Insights
                            </h3>
                            <p className="text-[9px] text-tatt-gray mt-1 font-bold uppercase tracking-widest">Sidebar featured orchestration</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Insight</label>
                                <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 relative group overflow-hidden">
                                     <div className="absolute top-0 right-0 p-2 opacity-5 scale-150">
                                        <TrendingUp size={40} />
                                    </div>
                                    <div className="size-10 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime-dark shadow-inner z-10">
                                        <Rocket size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <p className="text-sm font-black text-slate-900 truncate tracking-tight">
                                            {activeInsight ? activeInsight.title : "No active insight"}
                                        </p>
                                        <p className="text-[10px] text-tatt-lime-dark font-black uppercase tracking-tighter">
                                            {activeInsight ? `Started: ${formatDistanceToNow(new Date(activeInsight.createdAt), { addSuffix: true })}` : "Dormant Node"}
                                        </p>
                                    </div>
                                     {activeInsight && (
                                        <button 
                                            onClick={() => handleDeleteInsight(activeInsight.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors z-10"
                                        >
                                            <X size={16} />
                                        </button>
                                     )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orchestrate New Insight</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <input 
                                            className="w-full h-11 rounded-xl bg-slate-50/50 border-slate-200 text-sm focus:ring-2 focus:ring-tatt-lime placeholder:text-slate-300 font-bold" 
                                            placeholder="Topic Heading..." 
                                            type="text" 
                                            value={insightForm.title}
                                            onChange={(e) => setInsightForm({ ...insightForm, title: e.target.value })}
                                        />
                                    </div>
                                    <textarea 
                                        className="w-full rounded-xl bg-slate-50/50 border-slate-200 text-xs focus:ring-2 focus:ring-tatt-lime h-28 placeholder:text-slate-300 p-4 font-medium leading-relaxed" 
                                        placeholder="Insight summary and context..."
                                        value={insightForm.content}
                                        onChange={(e) => setInsightForm({ ...insightForm, content: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                                            <input 
                                                className="w-full h-10 pl-10 rounded-xl bg-slate-50/50 border-slate-200 text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-tatt-lime" 
                                                placeholder="Start Date" 
                                                type="text" 
                                                value={insightForm.startDate}
                                                onChange={(e) => setInsightForm({ ...insightForm, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="relative opacity-50 cursor-not-allowed">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                                            <input className="w-full h-10 pl-10 rounded-xl bg-slate-50/50 border-slate-200 text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-tatt-lime" placeholder="Time" type="text" disabled />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleDeployInsight}
                                        disabled={isDeploying}
                                        className="w-full py-4 bg-tatt-lime text-tatt-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:saturate-150 active:scale-[0.98] transition-all shadow-xl shadow-tatt-lime/20 mt-2 disabled:opacity-50"
                                    >
                                        {isDeploying ? "Deploying..." : "Deploy to Feed"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Prompts */}
                    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                <Zap className="text-tatt-lime size-3 fill-tatt-lime" />
                                Daily Prompt Node
                            </h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="p-6 rounded-2xl bg-tatt-black text-white space-y-4 shadow-2xl relative overflow-hidden group">
                                <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Megaphone size={120} />
                                </div>
                                <div className="flex justify-between items-start z-10">
                                    <span className="text-[9px] font-black text-tatt-lime uppercase tracking-[0.2em] bg-tatt-lime/10 px-2 py-1 rounded">
                                        {activePrompt ? "Active Stream" : "System Dormant"}
                                    </span>
                                </div>
                                <p className="text-sm font-bold leading-relaxed tracking-tight z-10 italic">
                                    {activePrompt ? `"${activePrompt.prompt}"` : '"Connect more nodes to generate a daily prompt."'}
                                </p>
                                <div className="flex items-center gap-5 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">
                                    <span className="flex items-center gap-2"><MessageSquare size={12} className="text-tatt-lime" /> {activePrompt?.messageCount || 0}</span>
                                    <span className="flex items-center gap-2"><Zap size={12} className="text-tatt-lime" /> {activePrompt?.zapCount || 0}</span>
                                </div>
                            </div>
                             <div className="space-y-3 pt-6 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrate New Prompt</h4>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 h-10 rounded-xl bg-slate-50/50 border-slate-200 text-xs focus:ring-2 focus:ring-tatt-lime placeholder:text-slate-300 px-3 font-medium" 
                                        placeholder="Enter prompt text..."
                                        value={promptInput}
                                        onChange={(e) => setPromptInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleCreatePrompt}
                                        className="px-4 bg-tatt-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={handleRotatePrompt}
                                disabled={isRotating}
                                className="w-full py-3.5 bg-slate-100 text-tatt-gray font-black text-[10px] uppercase tracking-[0.15em] rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isRotating ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw size={14} />}
                                Rotate Community Prompt
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function StatCard({ label, value, trend, icon, trendType = "up" }: { 
    label: string, 
    value: string, 
    trend: string, 
    icon: React.ReactNode,
    trendType?: "up" | "down"
}) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-7 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all group duration-300">
            <div className="flex items-center justify-between">
                <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-tatt-lime/10 transition-colors shadow-inner border border-slate-100">
                    {icon}
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    trendType === "up" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                }`}>
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">{label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter">{value}</p>
            </div>
        </div>
    );
}
